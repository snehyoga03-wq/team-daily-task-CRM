# Regular Employee Perspective HRMS Implementation & E2E Test Report

## 👤 User Context & Test Persona
- **Authenticated Employee**: Rahul Sharma (`rahul.sharma@snehyoga.com`)
- **Role**: Regular Employee (Non-Admin) | **Designation**: Software Developer
- **Department**: Engineering | **Access Scope**: Self Attendance, Leave Applications & Balances
- **Total Employee Actions Tested**: 12
- **Passed**: 12 | **Failed**: 0

---

## 📋 Employee Action Test Results & Verification Details

| # | Employee Action Scenario | Status | Verification Details |
| :-: | :--- | :-: | :--- |
| 1 | **Employee Attendance View Access** | ✅ PASS | Regular employee workspace loaded; HR Management restricted, Attendance view active |
| 2 | **Late Check-In & Fine Matrix Display** | ✅ PASS | Check-in post 9:45 AM marked Late; ₹1/min fine (₹25) and late minutes displayed |
| 3 | **Starting 45-Minute Lunch Break** | ✅ PASS | Status updated to On Break (Max 45m); break timer initiated for employee |
| 4 | **Resuming Work from Break** | ✅ PASS | Status restored to active working; break duration recorded |
| 5 | **Leave & WFH Application Modal Access** | ✅ PASS | Modal opened; supports Planned (3+ days), Short Notice, Emergency, & Exam leaves |
| 6 | **Planned Leave Submission (3+ Days Notice)** | ✅ PASS | Submitted 4-day advance leave request with required work coverage summary |
| 7 | **Short Notice Leave Submission** | ✅ PASS | Short notice leave submitted with mandatory short notice justification |
| 8 | **Emergency Current-Day Leave Submission** | ✅ PASS | Same-day emergency leave submitted with required emergency trigger reason |
| 9 | **Intern Exam Leave & Timetable Document Upload** | ✅ PASS | Exam leave submitted with valid exam timetable URL document attachment |
| 10 | **My Leave Balances & 2-Tier Approval Tracking** | ✅ PASS | Rendered accrued 1.5/mo balance, approved count, and pending Level 1/2 status badges |
| 11 | **Check-Out & Overtime Calculation** | ✅ PASS | Check-out post 7:30 PM evaluated OT; 1.0 hr Overtime logged automatically |
| 12 | **Personal Attendance Log CSV Export** | ✅ PASS | Personal monthly attendance log CSV downloaded for employee records |

---

## 📷 Employee View Screen Captures (Visual Evidence)

### 1. Employee Attendance Dashboard Access
![Employee Workspace](user_01_employee_attendance_view.png)

### 2. Late Check-In & Fine Matrix Display
![Late Check-In & Fine](user_02_late_checkin_fine_display.png)

### 3. Starting 45-Minute Lunch Break
![Lunch Break Started](user_03_lunch_break_started.png)

### 4. Resuming Active Work from Break
![Work Resumed](user_04_work_resumed.png)

### 5. Leave & WFH Application Modal Access
![Leave Modal Access](user_05_leave_application_modal.png)

### 6. Planned Leave Submission (3+ Days Notice)
![Planned Leave Submitted](user_06_planned_leave_submitted.png)

### 7. Short Notice Leave Submission
![Short Notice Leave](user_07_short_notice_leave_submitted.png)

### 8. Emergency Current-Day Leave Submission
![Emergency Leave](user_08_emergency_leave_submitted.png)

### 9. Intern Exam Leave & Timetable Document Upload
![Exam Leave Upload](user_09_exam_leave_submitted.png)

### 10. My Accrued Leave Balances & 2-Tier Approval Tracking Card
![Leave Balances Card](user_10_my_leave_balances_card.png)

### 11. Evening Check-Out & Overtime Auto-Calculation
![Check-Out & Overtime](user_11_checkout_overtime_calculated.png)

### 12. Personal Attendance Log CSV Export
![Personal CSV Export](user_12_personal_csv_exported.png)

---
*Report generated automatically on 8/11/2026, 11:50:55 AM*
