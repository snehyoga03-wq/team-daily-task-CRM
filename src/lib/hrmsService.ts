import { supabase, DbUser, DbHrPolicySettings, DbCompanyWfh, DbLeaveRequest, DbHrmsAuditLog, DbAttendance } from './supabase';
import { createNotification } from './dataService';

// Default policy settings fallback if database record isn't loaded yet
export const DEFAULT_HR_POLICY: DbHrPolicySettings = {
  id: 'default',
  weekday_start: '09:30:00',
  weekday_end: '18:30:00',
  saturday_start: '09:30:00',
  saturday_end: '17:00:00',
  grace_period_time: '09:45:00',
  late_mark_time: '10:00:00',
  half_day_report_cutoff: '12:00:00',
  late_minute_deduction_rate: 1.0,
  allowed_lates_before_halfday: 3,
  allowed_lates_before_fullday: 6,
  max_lunch_duration_minutes: 45,
  max_lunch_breaks_per_day: 1,
  overtime_threshold_minutes: 60,
  max_employee_wfh_per_month: 2,
  monthly_leave_credit: 1.5,
  max_leave_balance_cap: 3.0,
  intern_exam_leave_bonus: 7,
};

// ─── 1. AUDIT LOGGING HELPER ──────────────────────────────────────────

export async function logHrmsAudit(
  action: string,
  performedBy: string | null,
  targetUserId: string | null,
  details: string,
  previousValue?: any,
  updatedValue?: any
) {
  try {
    await supabase.from('hrms_audit_logs').insert({
      action,
      performed_by: performedBy,
      target_user_id: targetUserId,
      details,
      previous_value: previousValue || null,
      updated_value: updatedValue || null,
    });
  } catch (err) {
    console.error('Failed to record HRMS audit log:', err);
  }
}

export async function fetchHrmsAuditLogs() {
  try {
    const { data, error } = await supabase
      .from('hrms_audit_logs')
      .select('*, performer:users!performed_by(*), target_user:users!target_user_id(*)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return [];
  }
}

// ─── 2. POLICY SETTINGS MANAGEMENT ─────────────────────────────────────

export async function fetchHrPolicySettings(): Promise<DbHrPolicySettings> {
  try {
    const { data, error } = await supabase
      .from('hr_policy_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error || !data) return DEFAULT_HR_POLICY;
    return data as DbHrPolicySettings;
  } catch (err) {
    return DEFAULT_HR_POLICY;
  }
}

export async function saveHrPolicySettings(id: string, updates: Partial<DbHrPolicySettings>, adminUserId: string) {
  const previous = await fetchHrPolicySettings();
  let query = supabase.from('hr_policy_settings');
  let result;
  if (id && id !== 'default') {
    const { data, error } = await query.update(updates).eq('id', id).select().single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await query.insert(updates).select().single();
    if (error) throw error;
    result = data;
  }

  await logHrmsAudit('Policy Settings Change', adminUserId, null, 'Updated HR Policy Configuration', previous, result);
  return result as DbHrPolicySettings;
}

// ─── 3. ATTENDANCE & LATE FINE CALCULATOR ──────────────────────────────

export function calculateAttendanceStatus(
  checkInDate: Date,
  monthlyLateCount: number,
  policy: DbHrPolicySettings = DEFAULT_HR_POLICY
) {
  const dayOfWeek = checkInDate.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (dayOfWeek === 0) {
    return { status: 'weekly_off', isLate: false, lateMinutes: 0, fineAmount: 0, note: 'Sunday Weekly Off' };
  }

  const hours = checkInDate.getHours();
  const minutes = checkInDate.getMinutes();
  const timeInMins = hours * 60 + minutes;

  // Official Start: 9:30 AM (570 mins), Grace Cutoff: 9:45 AM (585 mins), Late Mark Cutoff: 10:00 AM (600 mins), Half Day Cutoff: 12:00 PM (720 mins)
  const officialStartMins = 9 * 60 + 30; // 9:30 AM
  const graceMins = 9 * 60 + 45; // 9:45 AM
  const lateCutoffMins = 10 * 60; // 10:00 AM
  const halfDayReportCutoffMins = 12 * 60; // 12:00 PM

  let status: DbAttendance['status'] | 'weekly_off' | 'absent' | 'half_day' | 'late' | 'present' = 'present';
  let isLate = false;
  let lateMinutes = 0;
  let fineAmount = 0;
  let note = '';

  if (timeInMins > graceMins) {
    isLate = true;
    lateMinutes = Math.max(0, timeInMins - officialStartMins);
    fineAmount = lateMinutes * (policy.late_minute_deduction_rate || 1.0);
  }

  if (timeInMins <= graceMins) {
    status = 'present';
    note = 'On-time check-in';
  } else if (timeInMins <= lateCutoffMins) {
    status = 'late';
    const currentLateIndex = monthlyLateCount + 1;
    if (currentLateIndex <= policy.allowed_lates_before_halfday) {
      note = `Late mark #${currentLateIndex} (${lateMinutes} mins) - ₹${fineAmount} fine`;
    } else if (currentLateIndex <= policy.allowed_lates_before_fullday) {
      status = 'half_day';
      note = `Late mark #${currentLateIndex} (${lateMinutes} mins) - Escalated to Half Day`;
    } else {
      status = 'absent';
      note = `Late mark #${currentLateIndex} (${lateMinutes} mins) - Escalated to Full Day Leave / LWP`;
    }
  } else if (timeInMins <= halfDayReportCutoffMins) {
    status = 'half_day';
    note = `Checked in after 10:00 AM (${lateMinutes} mins late) - Marked Half Day (Fine ₹${fineAmount})`;
  } else {
    status = 'absent';
    note = `Checked in after 12:00 PM cutoff (${lateMinutes} mins late) - Marked Full Day Leave / Absent`;
  }

  return { status, isLate, lateMinutes, fineAmount, note };
}

// ─── 4. OVERTIME CALCULATOR ──────────────────────────────────────────

export function calculateOvertimeHours(
  checkOutDate: Date,
  policy: DbHrPolicySettings = DEFAULT_HR_POLICY
): number {
  const dayOfWeek = checkOutDate.getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0) return 0; // No OT on weekly off automatically

  const isSaturday = dayOfWeek === 6;
  const closingHour = isSaturday ? 17 : 18; // 5:00 PM on Sat, 6:30 PM (18:30) on Mon-Fri
  const closingMinute = isSaturday ? 0 : 30;

  // OT Threshold: 1 hour after closing
  // Weekday: OT starts at 7:30 PM (19:30)
  // Saturday: OT starts at 6:00 PM (18:00)
  const otStartHour = isSaturday ? 18 : 19;
  const otStartMin = isSaturday ? 0 : 30;

  const checkOutMins = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();
  const otStartMins = otStartHour * 60 + otStartMin;

  if (checkOutMins > otStartMins) {
    const otDiffMins = checkOutMins - otStartMins;
    return Number((otDiffMins / 60).toFixed(1));
  }

  return 0;
}

// ─── 5. LUNCH BREAK ENFORCEMENT ──────────────────────────────────────

export async function validateLunchBreakStart(userId: string, date: string, policy: DbHrPolicySettings = DEFAULT_HR_POLICY) {
  const { data: logs, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('action_type', 'break');
  if (error) throw error;

  if (logs && logs.length >= policy.max_lunch_breaks_per_day) {
    throw new Error(`Only ${policy.max_lunch_breaks_per_day} lunch break is allowed per day. You have already taken your break today.`);
  }
  return true;
}

// ─── 6. LEAVE RULES & 2-TIER APPROVAL ENGINE ─────────────────────────

export function validateLeaveNoticeRule(startDateStr: string, leaveType: string, category?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);

  const diffTime = startDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (category === 'emergency' || leaveType === 'emergency') {
    if (diffDays !== 0) {
      throw new Error('Emergency Leave can only be applied for the current date.');
    }
  } else if (category === 'planned' || ['birthday', 'marriage', 'vacation'].includes(leaveType)) {
    if (diffDays < 3) {
      throw new Error('Planned leaves must be applied at least 3 days in advance.');
    }
  }
  return true;
}

export async function checkUserMonthlyWfhQuota(userId: string, monthStr: string, policy: DbHrPolicySettings = DEFAULT_HR_POLICY) {
  // Check employee-requested WFH count for current month
  const { data, error } = await supabase
    .from('leave_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('leave_type', 'wfh')
    .gte('start_date', `${monthStr}-01`)
    .lte('start_date', `${monthStr}-31`)
    .in('status', ['pending', 'approved', 'dept_head_approved']);

  if (error) throw error;
  const count = data?.length || 0;
  return { count, quotaExceeded: count >= policy.max_employee_wfh_per_month };
}

export async function submitLeaveRequest(payload: Partial<DbLeaveRequest>) {
  // Validate leave application constraints
  validateLeaveNoticeRule(payload.start_date!, payload.leave_type!, payload.category);

  // Check initial 2-tier approval statuses
  const leaveData = {
    ...payload,
    status: 'pending',
    dept_head_status: 'pending',
    office_manager_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('leave_requests').insert(leaveData).select().single();
  if (error) throw error;

  // Send notifications to Dept Head & Office Manager
  try {
    // Notify Founder (Information Only)
    const { data: founders } = await supabase.from('users').select('id').eq('role', 'founder');
    founders?.forEach(f => {
      createNotification({
        user_id: f.id,
        title: 'ℹ️ Leave Application Submitted',
        message: `Employee submitted a ${payload.leave_type?.toUpperCase()} leave request from ${payload.start_date} to ${payload.end_date}. (Info Only)`,
        type: 'leave_notice',
      });
    });
  } catch (err) {
    console.error('Failed sending leave notification:', err);
  }

  await logHrmsAudit('Leave Application Submitted', payload.user_id!, payload.user_id!, `Applied for ${payload.leave_type} leave from ${payload.start_date} to ${payload.end_date}`);
  return data as DbLeaveRequest;
}

// Level 1 Approval by Department Head
export async function approveLeaveByDeptHead(leaveId: string, deptHeadUserId: string) {
  const { data: existing } = await supabase.from('leave_requests').select('*').eq('id', leaveId).single();
  
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      dept_head_status: 'approved',
      dept_head_approved_by: deptHeadUserId,
      status: 'dept_head_approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', leaveId)
    .select()
    .single();

  if (error) throw error;

  await logHrmsAudit('Leave Dept Head Approved', deptHeadUserId, existing?.user_id, `Dept Head approved leave #${leaveId}`, existing, data);
  return data;
}

// Level 2 (Final) Approval by Founder's Office Manager
export async function approveLeaveByOfficeManager(leaveId: string, officeManagerUserId: string) {
  const { data: existing } = await supabase.from('leave_requests').select('*').eq('id', leaveId).single();
  
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      office_manager_status: 'approved',
      office_manager_approved_by: officeManagerUserId,
      approved_by: officeManagerUserId,
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', leaveId)
    .select()
    .single();

  if (error) throw error;

  // Send notification to employee
  if (existing?.user_id) {
    createNotification({
      user_id: existing.user_id,
      title: '🎉 Leave Approved!',
      message: `Your ${existing.leave_type} leave request from ${existing.start_date} to ${existing.end_date} has been fully approved.`,
      type: 'leave_approval',
    });
  }

  await logHrmsAudit('Leave Final Approved', officeManagerUserId, existing?.user_id, `Office Manager final approved leave #${leaveId}`, existing, data);
  return data;
}

export async function rejectLeaveRequest(leaveId: string, rejectedByUserId: string, reason?: string) {
  const { data: existing } = await supabase.from('leave_requests').select('*').eq('id', leaveId).single();

  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status: 'rejected',
      office_manager_status: 'rejected',
      approved_by: rejectedByUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leaveId)
    .select()
    .single();

  if (error) throw error;

  if (existing?.user_id) {
    createNotification({
      user_id: existing.user_id,
      title: '❌ Leave Request Rejected',
      message: `Your ${existing.leave_type} leave request was not approved. Reason: ${reason || 'Not specified'}`,
      type: 'leave_rejection',
    });
  }

  await logHrmsAudit('Leave Rejected', rejectedByUserId, existing?.user_id, `Rejected leave #${leaveId}`, existing, data);
  return data;
}

// ─── 7. COMPANY WFH DECLARATION TOOL ──────────────────────────────────

export async function createCompanyWfhDeclaration(declaration: Partial<DbCompanyWfh>, adminUserId: string) {
  const { data, error } = await supabase
    .from('company_wfh_declarations')
    .insert({
      ...declaration,
      created_by: adminUserId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  await logHrmsAudit('Company WFH Declared', adminUserId, null, `Declared Company WFH on ${declaration.date} due to: ${declaration.reason}`, null, data);
  return data as DbCompanyWfh;
}

export async function fetchCompanyWfhDeclarations() {
  const { data, error } = await supabase
    .from('company_wfh_declarations')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data as DbCompanyWfh[];
}

// ─── 8. MONTHLY EXPORTABLE REPORTS GENERATOR ──────────────────────────

export function generateHrmsMonthlyReportCsv(type: 'attendance' | 'late_fines' | 'leave' | 'wfh' | 'overtime', data: any[]) {
  let headers: string[] = [];
  let rows: string[][] = [];

  if (type === 'attendance') {
    headers = ['Employee Name', 'Date', 'Status', 'Check In', 'Check Out', 'Late (Mins)', 'Notes'];
    rows = data.map(row => [
      row.user?.full_name || 'N/A',
      row.date,
      row.status,
      row.check_in ? new Date(row.check_in).toLocaleTimeString() : '-',
      row.check_out ? new Date(row.check_out).toLocaleTimeString() : '-',
      row.late_minutes ? String(row.late_minutes) : '0',
      row.notes || ''
    ]);
  } else if (type === 'late_fines') {
    headers = ['Employee Name', 'Date', 'Check In Time', 'Late Minutes', 'Deduction Amount (₹)', 'Late Count This Month', 'Escalation Status'];
    rows = data.map(row => {
      const lateMins = row.late_minutes || 0;
      const fineVal = row.fine_amount !== undefined && row.fine_amount !== null ? row.fine_amount : (lateMins * 1.0);
      return [
        row.user?.full_name || 'N/A',
        row.date,
        row.check_in ? new Date(row.check_in).toLocaleTimeString() : '-',
        String(lateMins),
        `₹${fineVal}`,
        String(row.late_count || 1),
        row.notes || (row.status === 'half_day' ? 'Half Day Escalation' : 'Standard Deduction')
      ];
    });
  } else if (type === 'leave') {
    headers = ['Employee Name', 'Leave Type', 'Category', 'Start Date', 'End Date', 'Days', 'Reason', 'Status'];
    rows = data.map(row => [
      row.user?.full_name || 'N/A',
      row.leave_type,
      row.category || 'planned',
      row.start_date,
      row.end_date,
      String(row.total_days || 1),
      row.reason,
      row.status
    ]);
  } else if (type === 'wfh') {
    headers = ['Employee Name', 'WFH Type', 'Date / Period', 'Reason / Emergency Trigger', 'Planned Work Summary', 'Status'];
    rows = data.map(row => [
      row.user?.full_name || 'N/A',
      row.type || 'Employee Request',
      row.date || `${row.start_date} to ${row.end_date}`,
      row.reason,
      row.planned_work || '-',
      row.status || 'Approved'
    ]);
  } else if (type === 'overtime') {
    headers = ['Employee Name', 'Date', 'Closing Time', 'Check Out Time', 'Overtime Hours', 'Approved Status'];
    rows = data.map(row => [
      row.user?.full_name || 'N/A',
      row.date,
      row.closing_time || '18:30',
      row.check_out ? new Date(row.check_out).toLocaleTimeString() : '-',
      `${row.ot_hours || 0} hrs`,
      row.status || 'Verified'
    ]);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n' + rows.map(e => e.map(val => `"${val}"`).join(',')).join('\n');
  return encodeURI(csvContent);
}

// ─── 9. LEAVE BALANCES & PROFILE HELPERS ──────────────────────────────

export async function fetchLeaveBalances(userId: string) {
  try {
    const { data, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch leave balances:', err);
    return [];
  }
}

export async function updateEmployeeProfile(userId: string, updates: Record<string, any>, adminUserId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;

    await logHrmsAudit('Profile Updated', adminUserId, userId, `Updated employee profile for ${data.full_name}`, null, updates);
    return data;
  } catch (err) {
    console.error('Failed to update employee profile:', err);
    throw err;
  }
}

