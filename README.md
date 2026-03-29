# School Management System

Welcome to the School Management System! If you're new here, this file explains exactly what this application does, who it's for, and how it works.

---

## 📖 What is this system?

This is a comprehensive web application designed to help school administrators run their educational business smoothly. Whether the school has just one campus or multiple branches, this system digitizes and organizes all the day-to-day operations. 

Instead of using scattered spreadsheets or paper records, school staff can use this system to keep track of students, classes, payments, attendance, and inventory—all in one place.

## 🎯 Who is it for?

- **Super Administrators**: Owners or high-level managers who need to oversee the entire business, manage all branches, and have full control over data.
- **Administrators**: Branch managers or front-desk staff who handle daily operations like registering students, taking payments, and selling uniforms or books.

## ✨ What can this system do?

Here is a breakdown of the main things you can do in this system:

### 1. Student & Enrollment Management
When a new student joins the school, staff can easily register their profile. The system allows staff to:
- Enroll the student in specific programs or classes.
- Assign a pricing tier (e.g., standard pricing vs. special pricing).
- Calculate total sessions for their enrollment term.
- Keep track of their payment due dates and insurance policies.

### 2. Multi-Branch Support
If the school operates in multiple locations, this system keeps things organized. 
- You can create programs, products, or classes specific to one branch or available across all branches.
- Staff (based on permissions) can switch between viewing data for their assigned branch or the whole organization.

### 3. Program & Schedule Setup
Schools offer different types of programs (like English, Math, or Summer Camp). 
- You can map out different **pricing tiers** for these programs.
- Set up a **duration matrix** (e.g., the cost for taking the program 2 days a week vs. 5 days a week).
- Define specific class days and times.

### 4. Inventory & Point of Sale (Add-ons)
Schools often sell physical items like textbooks, uniforms, or stationary. 
- The **Inventory** section acts like a mini-store.
- You can organize items into custom folders (Product Groups) and add variants (like different sizes for a uniform).
- When registering a student, staff can easily sell these items as "add-ons" and include them in the student's bill.

### 5. Attendance Tracking
Teachers or staff need to know who showed up for class.
- The **Attendance** module provides a clear, spreadsheet-like grid or interface.
- Staff can mark students as Present, Absent, or adjust missing records easily.

### 6. Payment Processing
Keeping track of finances is critical.
- The **Payments** section tracks invoices, due dates, and paid vs. outstanding balances for enrolled students.

---

## 💻 For Developers (Technical Details)

This project is a modern web application built using the React framework:

- **Framework**: [Next.js](https://nextjs.org) (App Router approach)
- **Language**: [TypeScript](https://www.typescriptlang.org/) for stable, error-resistant code
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for beautiful, responsive design

### Getting Started Locally

1. Install the necessary dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and go to [http://localhost:3000](http://localhost:3000). You can start making code edits in the `app` folder, and the page will automatically update!

