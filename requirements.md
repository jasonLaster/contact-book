# Contact Book - Requirements Document

## 1. Overview

This application is a full-stack **Next.js** app (using the App Router) that manages a list of Contacts and Groups. It supports:

- Creating, reading, updating, and deleting (CRUD) Contacts.
- Managing multiple phone numbers per contact (with the ability to add/remove phone numbers and designate a "primary" one).
- Grouping contacts into categories, both system-defined (e.g., "All Contacts" or "Starred") and user-defined.
- Searching contacts by name, phone, or email.
- Viewing, editing, or deleting a single contact in a detail pane.
- Drag-and-drop image upload for the contact's avatar (stored on Vercel Blob).
- Automatic note-saving with a small time delay (auto-save on text field blur or 1 second after changes stop).

The code is split into multiple files in the `app/` directory (Next.js route handlers/layouts), `components/` for UI components and domain components, plus some `lib/` modules for server-side data actions and utility functions.

**_Question:_** We see some references to "system groups" (like "Favorites" or "Starred") in the code. Are there any official or additional system groups beyond the ones we see in the code (i.e., "All Contacts," "Starred," etc.) or is that set flexible?

---

## 2. Architecture & Key Components

### 2.1 Next.js App Structure

- **`app/layout.tsx`**  
  Defines the root layout of the application (basic HTML structure, global CSS import).

- **`app/page.tsx`**  
  The main page that shows:  
  1. A sidebar containing groups (`GroupsSidebar`).
  2. A contact list (`ContactList`).
  3. A detail pane for the selected contact (`ContactPane`) for large-screen devices.  
  For smaller screens (mobile), the contact detail is shown on a separate route (`/contact/[urlName]`).

- **`app/contact/[urlName]/page.tsx`**  
  Renders a single contact detail page for mobile (using `ContactPane`).

- **`app/contact/[urlName]/layout.tsx`**  
  Example dynamic layout usage (this file is mostly illustrative in the code snippet; minimal code is shown).

- **`globals.css`**  
  Global Tailwind/CSS styling for the entire app.

### 2.2 UI Components

The `components/` directory contains many UI elements (some from a design system or utility library). Key domain-specific components:

- **`components/contact-list.tsx`**  
  Renders a scrollable, alphabetically partitioned list of Contacts.  
  - Uses native browser scrolling with optimized performance for smooth scrolling and header transitions
  - Implements sticky alphabetical headers that remain fixed at the top while scrolling through their respective sections
  - Headers smoothly transition between sections as the user scrolls, with the next section's header pushing the current one up
  - Supports searching and grouping with dynamic section headers
  - Features an alphabetical navigation sidebar that enables quick jumping to sections with smooth scrolling
  - On mobile, a contact detail is not rendered side-by-side but is navigated to separately.

- **`components/contact-pane.tsx`**  
  Renders the right-hand details for a single contact (or a full-page modal on mobile).  
  - Allows editing or read-only mode of contact name, phone numbers, email, and notes.  
  - Supports drag-and-drop image uploading for avatar.  
  - Integrates with `updateContact` server action to persist changes.  
  - Auto-saves the notes field after 1 second of inactivity or on blur.

- **`components/groups-sidebar.tsx`**  
  Shows the expandable/collapsible sidebar with system groups and custom groups.  
  - Integrates with `AddGroupDialog` (a modal to create custom groups).  
  - Supports editing custom groups (renaming them with optional emoji prefix).  
  - Clicking a group filters the contact list.  
  - "All Contacts" is the default or fallback group.

- **`components/edit-contact-form.tsx`**  
  Separate form for editing contact details (older or alternative approach). The main editing functionality is now in `ContactPane`, so this file duplicates some logic. It still references `updateContact`.

- **`components/add-contact-dialog.tsx`**  
  Provides a button and dialog for quickly creating a new contact with name, optional email, notes, and multiple phone numbers.

- **`components/add-group-dialog.tsx`**  
  Enables the user to create a new custom group. Also allows picking an emoji to prefix the group name.

- **`components/delete-contact-dialog.tsx`**  
  Displays a confirmation dialog for deleting a contact, calls `deleteContact`.

In addition, there are many smaller "ui/" components that are either:
- Wrappers around popular libraries (e.g., Radix UI, Recharts, Lucide Icons, etc.).
- Low-level building blocks like `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Popover`, etc.

### 2.3 Database Schema and Server Actions

- **`lib/db/schema.ts`**  
  Defines tables using drizzle-ORM:
  - `contacts` table: columns `id`, `name`, `email`, `notes`, `imageUrl`, `createdAt`.
  - `phoneNumbers` table: columns `id`, `contactId`, `number`, `label`, `isPrimary`.
  - `groups` table: columns `id`, `name`, `type`, `createdAt`.
  - `contactGroups` table: bridging table for many-to-many relationships between `contacts` and `groups`.
  
- **`lib/actions.ts`**  
  Contains serverless functions (Next.js "server actions") that handle:
  1. **`getContacts(search, groupId)`**:  
     - Retrieves all contacts (and phone numbers) from DB.  
     - Optionally filters by a search string (applied client-side after retrieving them, except for group filtering which is done in the query).  
     - Optionally filters by group if `groupId` is provided.
  2. **`addContact(name, phones[], email?, notes?)`**:  
     - Creates a contact row.  
     - Optionally inserts multiple phone numbers.  
     - Revalidates the homepage.
  3. **`updateContact(id, data, imageFile?)`**:  
     - Updates contact info and phone numbers.  
     - Optionally uploads an avatar image to Vercel Blob, updating the DB with `imageUrl`.  
     - Revalidates the homepage.  
     - Returns the updated contact + phoneNumbers for further usage.
  4. **`deleteContact(id)`**:  
     - Deletes the contact record and its phone numbers.  
     - Revalidates the homepage.
  5. **`addGroup(name)`**:  
     - Inserts a new group row (type = 'custom').  
     - Revalidates homepage.
  6. **`updateGroup(id, name)`**:  
     - Renames an existing group.  
     - Revalidates homepage.
  7. **`deleteGroup(id)`**:  
     - Removes group + associated contact-group bridging rows.  
     - Revalidates homepage.
  8. **`addContactToGroup(contactId, groupId)`** / **`removeContactFromGroup(contactId, groupId)`**:  
     - Updates bridging table for membership in a group.  
     - Revalidates homepage.

- **`lib/db/index.ts`**  
  Configures the database connection to Neon (Postgres) using drizzle-ORM.  
  Uses `@neondatabase/serverless`.

### 2.4 Routing & Navigation

- **Desktop**:  
  Main route `/` shows a three-column layout:
  1. Groups Sidebar (with system and custom groups).  
  2. Contact List.  
  3. Contact Pane (detail) on the right (for whichever contact is selected).  

  The "selection" is driven by query parameters (e.g., `/?search=...` or `/?contact=...`).  

- **Mobile**:  
  The same URL (`/`) shows only the contact list and group sidebar in a single column.  
  When the user taps on a contact, they navigate to `/contact/[urlName]` which shows the full detail page.  

### 2.5 State Management

- The majority of UI state is local (React `useState`, `useEffect`).  
- Searching is done via a query param (`search`).  
- The user's selected group is also a query param (`group`).  
- The user's selected contact is a query param (`contact`) on desktop, or a dynamic route segment on mobile.

### 2.6 Searching, Sorting, & Grouping

1. **Search** is done in `getContacts`, which fetches all contacts, then does a client-side filter by matching the search string against:
   - Name (case-insensitive).
   - Email (case-insensitive).
   - Phone numbers.  
   **_Question:_** The code shows `contact.phoneNumbers.some(phone => phone.number.includes(search))`. We need to confirm if partial matches or prefix-only matches are desired. Is substring matching acceptable for phone number searching?

2. **Grouping** is done by either:
   - Setting a `group` query param (client route reload).
   - If `groupId` is present, the server query does an inner join on `contactGroups`.

3. **Sorting** is alphabetical by the contact's name.  
4. Within the Contact List, contacts are grouped by the first letter (A-Z). Letters outside [A-Z] are currently ignored.  
   **_Question:_** Should we handle letters outside `[A-Z]`, or should they always appear in a "#" or "Other" section?

### 2.7 Contact Pane Editing Flow

- The detail pane has "edit mode" toggled by a button.  
- When editing, the user can:
  - Add, remove, reorder phone numbers (via drag-and-drop).  
  - Change the name, email, or notes.  
  - If user updates notes, they're auto-saved after 1 second of no typing or on blur.  
- Avatars can be replaced by clicking or dragging in an image.

### 2.8 Groups Sidebar

- Collapsible/expandable on the left.  
- Lists both system and custom groups.  
- Supports editing a custom group's name or emoji prefix.  
- "Add Group" opens a dialog to create a new group.

### 2.9 Error Handling & Notifications

- Many server actions are wrapped in try/catch blocks.  
- The UI displays toasts (via `useToast`) for errors or successes.  
- If an image upload fails, the user sees a toast with "Failed to upload."

### 2.10 Performance & Scalability

- The contact list uses native browser scrolling with CSS sticky positioning for optimal performance
- Minimal database calls are used by Next.js server actions, each revalidating the main page
- **_Question:_** There is a potential optimization for search if we do server-side filtering. Right now, `getContacts()` returns everything, then filters in code for the search term. Confirm if that is acceptable or if server-side filtering is planned (especially for large data sets).

---

## 3. Detailed Functional Requirements

1. **Contact Management**  
   - **Create** a new contact from the "Add Contact" dialog. At a minimum, a contact needs a name. Additional phone numbers, email, and notes are optional.  
   - **Read** contacts in the main list or a selected group.  
     - The system ensures phone numbers are associated and displayed with each contact.  
   - **Update** a contact's name, phone numbers (add/remove, reorder, set primary), notes, and email.  
     - Changes are persisted via `updateContact()`.  
     - If an avatar image is provided (drag-and-drop or file picker), the image is uploaded to Vercel Blob, and `contacts.imageUrl` is updated in DB.  
   - **Delete** a contact from either the "Delete" button in the contact pane or using the `DeleteContactDialog`.  

2. **Phone Number Handling**  
   - A contact can have multiple phone numbers, each with a `label`, `isPrimary`, and the phone number text.  
   - "Primary" is indicated by a boolean. The UI allows toggling which number is primary.  
   - Client-side phone number formatting is done on input (very simple parentheses/dashes logic).

3. **Notes Auto-save**  
   - Notes field has a clean, minimal appearance with no visible borders
   - Maintains consistent padding (12px) without layout shifts
   - Uses theme background color for seamless integration
   - Changes are auto-saved in two scenarios:
     - After 1 second of no typing (debounced)
     - When the field loses focus (blur event)
   - Visual feedback during save:
     - Subtle gradient animation moving left to right
     - Uses theme colors (indigo to purple)
     - Low opacity (0.1-0.3) for non-intrusive feedback
     - Animation duration: 3 seconds with smooth easing
   - Technical considerations:
     - Preserves textarea functionality (scrolling, resize)
     - Maintains text position during save animation
     - Ensures consistent behavior across theme changes
   - Error handling:
     - If saving fails, an error toast is displayed
     - Original content is preserved on save failure

4. **Groups**  
   - **System** groups have a `type = 'system'` in the DB, e.g. "Starred," though the code's example only shows `'system'` for certain ones.  
   - **Custom** groups are user-created (`type = 'custom'`). The user can add a name and optional emoji.  
   - A contact can belong to multiple groups.  
   - The UI shows the count of how many contacts are in each group.  
   - The user can rename a custom group or delete it.  
   - The user can add or remove a contact to/from a group via a checkbox in the `Popover` triggered by the group icon on the contact detail screen.

5. **Search**  
   - The user can type a string in the "Search" input.  
   - The URL updates with `?search=someTerm`.  
   - The contact list is filtered to only those whose name, email, or phone matches the string.  
   - Searching currently is done after fetching all contacts on the client.

6. **UI Layout**  
   - Desktop: Tri-column layout (Groups / List / Detail Pane).  
   - Mobile: Collapsed layout (Groups, then the list; contact detail is a separate page).  
   - The detail pane can be closed via "Back" arrow in mobile view. On desktop, switching the query param closes it.

7. **Error States & Toasts**  
   - Every server action is wrapped in try/catch. A toast is shown with "Error" if something fails.  
   - The code references a possible "Data transfer quota exceeded" error which also triggers a special alert dialog.

8. **Image / Avatar Handling**  
   - The user can click or drop an image onto the avatar area.  
   - The file is uploaded to Vercel Blob.  
   - On success, the DB is updated with the new `imageUrl`.  
   - On failure, a toast is displayed, and the old image remains.

---

## 4. Non-Functional Requirements

1. **Performance**  
   - Must load contact list quickly using virtualization.  
   - Auto-saves for notes should not block user input.

2. **Usability**  
   - Minimal friction for adding new contacts or phone numbers.  
   - Minimal friction for searching or grouping.

3. **Scalability**  
   - The DB queries should handle at least thousands of contacts.  
   - Potential future improvement: move to server-side filtering to handle extremely large datasets.

4. **Maintainability**  
   - The code is organized around Next.js server actions.  
   - The UI is modular.  
   - The data layer is clearly separated (`lib/actions.ts` + drizzle schema).

5. **Data Integrity**  
   - Deleting a contact also deletes its phone numbers.  
   - Deleting a group removes the bridging table entries.

6. **Security**  
   - Minimal mention of authentication in the code. **_Question:_** Is authentication or protected routes needed in production?  
   - Data is stored in a Neon-hosted Postgres instance, presumably behind credentials and TLS.

---

## 5. Error Handling & Edge Cases

1. **No Contact Selected**  
   - The right-hand panel (on desktop) or the entire route (on mobile) says "No Contact Selected."
2. **Contact Not Found**  
   - If the user tries to navigate to `/contact/[urlName]` with an invalid contact, Next.js calls `notFound()`.
3. **Invalid Image Type**  
   - If the user drags a non-image file, a toast with "Invalid file" is shown.
4. **Data Transfer Quota**  
   - If the user hits a data quota limit, an alert dialog appears to indicate the plan must be upgraded.
5. **Group Does Not Exist**  
   - If a user tries to filter by a group that doesn't exist, the contact list is empty.  
     **_Question:_** Should we show an error or a "Group not found" message in the UI?

---

## 6. Installation & Setup

1. **System Requirements**  
   - Node.js 18+  
   - Yarn or npm  
   - A Neon Postgres DB connection string.

2. **Env Variables**  
   - `POSTGRES_URL` must be set (Neon connection).  
   - The code references `@vercel/blob` for file uploads, so any relevant tokens/keys must be configured for that.

3. **Local Development**  
   - `yarn install` (or `npm install`)  
   - `yarn dev` (or `npm run dev`)

4. **Production Deployment**  
   - Deploy on Vercel or a platform supporting Next.js App Router + Server Actions.  
   - The environment variables must be set for DB and Vercel Blob.

---

## 7. Future Enhancements (Potential)

1. **Better Search**  
   - Perform server-side fuzzy search for large datasets.  
   - Possibly store phone numbers in a more index-friendly manner.

2. **Additional System Groups**  
   - E.g. "Recently Added," "Frequent," "Archived," etc.

3. **Bulk Operations**  
   - Deleting multiple contacts or adding them to a group in one step.

4. **Authentication**  
   - Integrate user auth so each user has a separate contact list.

5. **International Phone Number Formatting**  
   - Use a library for robust phone formatting.

6. **Offline Support**  
   - Potentially store data locally (e.g. localStorage or IndexedDB) for offline usage.

---

## 8. Questions / Clarifications

1. **System Groups**  
   - Are there specific system groups the user can't rename or delete? Currently it's implied that "All Contacts" or "Starred" might be system groups. Confirm the full set?

2. **Search Implementation**  
   - Currently we do partial substring matching on phone, name, and email. Is this the desired behavior?

3. **Handling of Non-English Letters**  
   - If a contact's name starts with a Unicode character outside `[A-Z]`, do we place it in an "Other" section or ignore? The current code discards them.

4. **Authentication**  
   - Should this app be user-specific or is it a single-user system? The code does not show any password or user management.

5. **Error Handling**  
   - When an error occurs in server actions, should we do anything beyond showing a toast? (Logging, e.g. Sentry?)

---

## 9. Maintenance & Updating the Requirements

- This doc must be updated **any** time a new feature or behavior is introduced in the codebase.
- Ensure the data model changes are reflected in Section 2.3 (Database Schema).
- Adjust the Non-Functional Requirements (Section 4) if performance or environment changes are made.
- Update the detailed flows if or when new UI or server actions are added.

---

## Notes Field

The notes field is a key part of the contact details that allows for free-form text input:

### Styling
- No visible borders in normal state
- Clean, minimal appearance that integrates with the UI
- Maintains consistent padding (12px) without shifting
- Uses theme background color

### Save Behavior
- Auto-saves after 1 second of no typing
- Also saves on blur (when clicking away)
- Shows a subtle animation during save:
  - Gradient moves from left to right
  - Uses theme colors (indigo to purple)
  - Gentle opacity (0.1-0.3) for non-intrusive feedback
  - Animation duration: 3 seconds
  - Smooth easing for natural movement

### Technical Implementation
- Uses a debounced save to prevent too frequent API calls
- Maintains text position and padding during save animation
- Preserves textarea functionality (scrolling, resize)
- Ensures consistent behavior across theme changes

## Recent Changes

### Notes Field Enhancement
- Removed default borders and focus rings
- Added smooth save animation
- Fixed text positioning issues
- Improved visual feedback for saving state

**End of Requirements**