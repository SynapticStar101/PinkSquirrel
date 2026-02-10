# NoteKeeper - Future Features Roadmap

## Phase 1 (Current) - Core MVP
- [x] Photo upload of handwritten notes
- [x] OCR text extraction (Tesseract.js)
- [x] Task confirmation and editing workflow
- [x] Priority setting (Urgent / Soon / When Possible)
- [x] Due date assignment
- [x] Task list with filtering and sorting
- [x] Complete/uncomplete tasks
- [x] Edit and delete tasks
- [x] Quick-add manual task entry
- [x] Local storage persistence
- [x] Warm, accessible design for 80+ users
- [x] First-time onboarding
- [x] Drag-and-drop image upload
- [x] Mobile camera support
- [x] Stats dashboard (total/done/overdue)

## Phase 2 - Property Management Enhancements
- [ ] **Property assignment** - Link tasks to specific properties (e.g., "123 Main St", "456 Oak Ave")
- [ ] **Property address book** - Manage a list of all properties with addresses
- [ ] **Task categories** - Maintenance, Tenant Communication, Financial/Rent, Inspection, Administrative
- [ ] **View by property** - See all tasks grouped under each property
- [ ] **Recurring tasks** - Monthly inspections, quarterly HVAC, annual lease renewals, weekly lawn care
- [ ] **Task templates** - Pre-built task lists for common scenarios (new tenant move-in, property inspection, annual maintenance)

## Phase 3 - Reminders & Notifications
- [ ] **Daily summary** - Morning notification: "You have 4 tasks for today"
- [ ] **Overdue alerts** - Browser push notifications for missed deadlines
- [ ] **Email reminders** - Optional daily/weekly email digest
- [ ] **Calendar integration** - Export tasks to Google Calendar / Outlook
- [ ] **Custom reminder times** - Set specific reminder times for individual tasks

## Phase 4 - Collaboration & Sharing
- [ ] **Shared access** - Let a trusted helper (family member, assistant, employee) view the task list
- [ ] **View-only link** - Generate a shareable read-only link to the task list
- [ ] **Task delegation** - Assign tasks to specific people (e.g., a handyman, tenant, solicitor)
- [ ] **Comments on tasks** - Add notes/updates to a task over time
- [ ] **Activity log** - See who did what and when

## Phase 5 - Smart Features
- [ ] **Voice input** - "Speak Your Task" button using Web Speech API for hands-free task entry
- [ ] **Improved OCR** - Cloud-based OCR (Google Cloud Vision / Azure) for better handwriting recognition
- [ ] **Smart suggestions** - Auto-suggest priorities and due dates based on task content
- [ ] **Photo attachments** - Attach photos of maintenance issues, documents, etc. to tasks
- [ ] **Document scanning** - Scan contracts, letters, and invoices alongside notes

## Phase 6 - Data & Export
- [ ] **Cloud sync** - Sync tasks across devices (phone, tablet, desktop)
- [ ] **Export to CSV/PDF** - Download task lists for printing or sharing
- [ ] **Printable daily checklist** - Generate a paper checklist for the day
- [ ] **Backup & restore** - Export all data for safekeeping
- [ ] **Search** - Full-text search across all tasks and notes

## Phase 7 - Progressive Web App
- [ ] **PWA install** - Add to home screen on phone/tablet
- [ ] **Offline mode** - Full functionality without internet, sync when back online
- [ ] **Auto-save** - Never lose a task, even if the browser crashes
- [ ] **Fast loading** - Under 3 seconds on any device

## Design Principles (Non-Negotiable)
1. Giant, obvious buttons (60px+ targets) with text labels on everything
2. 24px+ body text with WCAG AAA (7:1) contrast ratios
3. Two-tap scanning: tap "Scan" -> take photo -> tasks appear
4. One task per screen for editing; flat, linear navigation
5. Persistent undo, confirmation dialogs, and auto-save
6. Simple, friendly language - no tech jargon ever
7. Works on tablet, desktop, and phone equally well
8. Always-available help and contextual guidance
