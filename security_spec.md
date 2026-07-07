# Security Specification - Growth & Product Workspace

## 1. Data Invariants
* **User isolation**: A user can only access, create, update, or delete their own data under `/users/{userId}`.
* **Authentication**: All writes must be fully authenticated and verified (`request.auth.token.email_verified == true`).
* **ID Poisoning Protection**: All document IDs must be validated using `isValidId()`.
* **Immortal Fields**: Fields like `createdAt` must not be updated once written.
* **Timestamp Integrity**: `createdAt` and `updatedAt` must be set using the server-provided `request.time`.
* **Immutability of Owner**: The owner (`userId`) or structural parent-child relationships cannot be reassigned.
* **Strict Type and Size Checks**: Every field must be explicitly typed, strings must have size limits, and lists must have bounded lengths.

## 2. The "Dirty Dozen" Malicious Payloads

### Payload 1: Privilege Escalation on User Profile Creation
* **Target**: `/users/attacker-id`
* **Malicious fields**: `{ "role": "admin", "email": "attacker@gmail.com", "createdAt": "2026-07-05T00:00:00Z" }`
* **Vulnerability targeted**: Setting arbitrary administrative/role fields or fake client-side timestamps.

### Payload 2: Account Takeover via Spoofed User ID
* **Target**: `/users/victim-id`
* **Malicious fields**: `{ "email": "attacker@gmail.com", "updatedAt": "request.time" }`
* **Vulnerability targeted**: Writing to another user's profile document.

### Payload 3: Shadow Update / Field Injection on Task
* **Target**: `/users/attacker-id/tasks/task-123`
* **Malicious fields**: `{ "id": "task-123", "title": "Buy Bitcoin", "category": "Content Marketing", "status": "Done", "priority": "High", "isCaseStudyOrInsight": false, "ghostField": "malicious-payload" }`
* **Vulnerability targeted**: Injecting unmapped/ghost fields into task records.

### Payload 4: Orphaned Task Creation (Invalid Parent Reference)
* **Target**: `/users/non-existent-user-id/tasks/task-123`
* **Malicious fields**: `{ "id": "task-123", "title": "Orphaned", "category": "Content Marketing", "status": "To Do", "priority": "Low", "isCaseStudyOrInsight": false }`
* **Vulnerability targeted**: Bypassing relational hierarchy by writing to collections belonging to non-existent users.

### Payload 5: ID Poisoning on Task ID
* **Target**: `/users/attacker-id/tasks/junk-characters-very-long-id-that-is-over-100-characters-and-violates-regex`
* **Malicious fields**: `{ "id": "junk-characters-very-long-id-...", "title": "Junk", "category": "Content Marketing", "status": "To Do", "priority": "Low", "isCaseStudyOrInsight": false }`
* **Vulnerability targeted**: Denial of Wallet and Resource exhaustion via bloated document paths.

### Payload 6: Value Poisoning / Type Violation
* **Target**: `/users/attacker-id/tasks/task-123`
* **Malicious fields**: `{ "id": "task-123", "title": 12345, "category": "Content Marketing", "status": "To Do", "priority": "Low", "isCaseStudyOrInsight": "not-a-boolean" }`
* **Vulnerability targeted**: Writing invalid data types to corrupt database schemas.

### Payload 7: Timestamp Spoofing (Client-Side Injection)
* **Target**: `/users/attacker-id/tasks/task-123`
* **Malicious fields**: `{ "id": "task-123", "title": "Spoofed", "category": "Content Marketing", "status": "To Do", "priority": "Low", "isCaseStudyOrInsight": false, "createdAt": "2020-01-01T00:00:00Z" }`
* **Vulnerability targeted**: Forging task creation times to bypass reporting logic.

### Payload 8: Unauthorized Task Deletion of Victim's Work
* **Target**: `/users/victim-id/tasks/task-123`
* **Operation**: `DELETE` by attacker
* **Vulnerability targeted**: Lack of source authenticity check on delete operations.

### Payload 9: Unauthorized Multi-User Task Harvesting (Query Scraping)
* **Target**: `/users/victim-id/tasks`
* **Operation**: `LIST` (without scoping to auth UID)
* **Vulnerability targeted**: Bypassing owner constraints on list operations.

### Payload 10: State Shortcutting / Invalid Status Value
* **Target**: `/users/attacker-id/tasks/task-123`
* **Malicious fields**: `{ "id": "task-123", "title": "Bypass State", "category": "Content Marketing", "status": "SUPER_COMPLETED_STATUS", "priority": "Low", "isCaseStudyOrInsight": false }`
* **Vulnerability targeted**: Injecting arbitrary string values into enum status fields.

### Payload 11: Bloated Description Injection (DoS/Storage Bloat)
* **Target**: `/users/attacker-id/tasks/task-123`
* **Malicious fields**: `{ "id": "task-123", "title": "Bloated Notes", "category": "Content Marketing", "status": "To Do", "priority": "Low", "isCaseStudyOrInsight": false, "notes": "<1MB of repetitive spam text...>" }`
* **Vulnerability targeted**: Exceeding reasonable field length to abuse database resource limits.

### Payload 12: KPI Actuals Out-of-Bound Injection
* **Target**: `/users/attacker-id/kpiActuals/2026-07`
* **Malicious fields**: `{ "monthKey": "2026-07", "leadsActual": -500, "mqlsActual": 9999999999, "webConvActual": 1.5, "emailContactsActual": -1 }`
* **Vulnerability targeted**: Corrupting analytics metrics with negative values or oversized numbers.

---

## 3. Test Runner Definition (`firestore.rules.test.ts`)
```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

// Standard security integration suite verifying that the "Dirty Dozen" payloads
// are fully blocked and reject with PERMISSION_DENIED.
// (Run locally or via emulators as part of CI validation workflows).
```
