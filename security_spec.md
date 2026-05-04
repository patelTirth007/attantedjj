# Security Specification: EduAttend Protocol

## Data Invariants
1. A **Session** cannot be started for a course that the faculty member does not own.
2. an **Attendance Record** cannot be created without a valid Session ID.
3. Users cannot change their own **role** after registration (Immutability).
4. **Attendance records** are immutable once created.
5. All IDs must follow `^[a-zA-Z0-9_\-]+$`.

## The Dirty Dozen (Threat Vectors)
1. **Identity Injection**: Student attempts to register with `role: "admin"`.
2. **Ghost Update**: Faculty member tries to add a field `isVerified: true` to their profile that doesn't exist in the schema.
3. **Relational Bypass**: Student tries to mark attendance for a session that has already `ended`.
4. **Temporal Manipulation**: Client sends a `timestamp` from 2 hours ago to fake attendance.
5. **ID Poisoning**: Injecting a 1MB string as a `courseId`.
6. **Shadow Read**: Student attempts to list all users in the `users` collection.
7. **Privilege Escalation**: Faculty member attempts to delete a course they don't own.
8. **PII Leakage**: Authenticated user attempts to fetch another user's email directly.
9. **Duplicate Handshake**: Student tries to submit two attendance records for the same session.
10. **State Corruption**: Faculty member tries to change a session `status` from `ended` back to `active`.
11. **Orphaned Writes**: Creating attendance for a non-existent course.
12. **Recursive Attack**: Querying the `users` collection without a `where` clause to scrape all emails.

## Test Runner Logic
The `firestore.rules` will be validated against these vectors by:
- Enforcing `affectedKeys().hasOnly()` for all updates.
- Using `isValidId()` for all document IDs.
- Validating `request.time` against all timestamp fields.
- Restricting `allow list` queries strictly via `resource.data`.
