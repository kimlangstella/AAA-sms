# Firestore Database Schema

This document lists the correct field names used by the application. **Please use these exact names** if you are manually editing data in the Firebase Console.

## 1. Collection: `students`
| Field Name | Type | Example |
|------------|------|---------|
| `student_id` | string | "std_123" |
| `student_name` | string | "Sok Dara" |
| `student_code` | string | "S001" |
| `gender` | string | "Male" |
| `dob` | string | "2005-05-15" |
| `pob` | string | "Phnom Penh" |
| `nationality` | string | "Cambodian" |
| `phone` | string | "012333444" |
| `address` | string | "#123, St 200, PP" |
| `father_name` | string | "Sok Visal" |
| `mother_name` | string | "Chan Thida" |
| `parent_phone` | string | "012555666" |
| `branch_id` | string | "branch_main" |
| `status` | string | "Active" |
| `image_url` | string | "https://..." |
| `created_at` | string | "2026-01-15T..." |

> **Note**: Do not use `first_name` or `last_name`. Use `student_name`.

---

## 2. Collection: `classes`
| Field Name | Type | Example |
|------------|------|---------|
| `class_id` | string | "class_a1" |
| `class_name` | string | "English Level 1" |
| `program_name` | string | "General English" |
| `branch_id` | string | "branch_main" |
| `room` | string | "101" |
| `total_students` | number | 0 |
| `status` | string | "Active" |

---

## 3. Collection: `branches`
| Field Name | Type | Example |
|------------|------|---------|
| `id` | string | "branch_main" |
| `name` | string | "Main Campus" |
| `address` | string | "123 St..." |
| `phone` | string | "012..." |

---

## 4. Collection: `attendance`
| Field Name | Type | Example |
|------------|------|---------|
| `enrollment_id` | string | "enr_123" |
| `student_id` | string | "std_123" |
| `class_id` | string | "class_a1" |
| `session_number` | number | 1 |
| `status` | string | "Present" |
| `recorded_at` | string | "2026-01-15T..." |
