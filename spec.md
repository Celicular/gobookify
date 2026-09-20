# Digital Book Reader

## 1. Product

Build a **mobile-first web application that turns uploaded PDFs into beautiful, interactive digital books**.

The user experience must be extremely simple:

```text
Open app
   ↓
Open a PDF
   ↓
Read
   ↓
Flip pages
   ↓
Highlight / doodle when desired
```

The application should feel like **reading a beautiful physical book on a phone**, not using a PDF editor.

The visual design system will be provided separately.

Do not invent a competing design system.

---

# 2. Core Experience

The application has three primary experiences:

### Library

The user sees their books.

### Reader

The user reads the selected book.

### Annotation

The user can highlight and doodle directly on the book.

Everything else is secondary.

Do not clutter the application with unnecessary dashboards, statistics, menus, or configuration screens.

---

# 3. Technology

Frontend:

* React
* Vite
* Tailwind CSS
* Framer Motion
* React Router

Browser APIs may be used where necessary:

* IndexedDB
* File API
* Blob
* Canvas
* Pointer Events
* URL APIs
* Storage API

Cloud storage:

* Cloudflare R2

Minimal Cloudflare infrastructure:

* Cloudflare Worker for secure generation of R2 presigned URLs.

The Worker exists only as a secure signing layer.

It must NOT become a traditional application backend.

---

# 4. Storage Architecture

Use this architecture:

```text
                     APPLICATION

                         │
             ┌───────────┴───────────┐
             │                       │
          R2 Storage              IndexedDB
             │                       │
          PDF files             User state
             │                       │
             │                 ┌─────┴─────┐
             │                 │           │
             │             Highlights   Drawings
             │                 │           │
             │              Bookmarks   Progress
             │
             ▼
       Browser Reader
```

## R2 stores

Only the original PDF files.

Example:

```text
books/
  user-or-device-id/
    book-id/
      original.pdf
```

## IndexedDB stores

* Book metadata.
* R2 object key.
* Reading progress.
* Current page.
* Highlights.
* Doodles.
* Bookmarks.
* Local preferences.
* Annotation history where required.

Do NOT store the entire PDF inside IndexedDB.

---

# 5. R2 Security

Never expose R2 secret credentials inside the React application.

The frontend must never contain:

```text
R2_SECRET_ACCESS_KEY
R2_SECRET_KEY
```

Instead:

```text
React
  ↓
Cloudflare Worker
  ↓
Generate presigned URL
  ↓
React receives temporary URL
  ↓
Browser uploads/downloads directly from R2
```

R2 supports presigned `PUT`, `GET`, `HEAD`, and `DELETE` URLs, specifically allowing browsers to interact with objects without exposing API credentials.

Configure R2 CORS for the application origin because browser requests to R2 require appropriate CORS configuration.

---

# 6. Upload Flow

When the user chooses:

**Open PDF**

the application should:

1. Open the device file picker.
2. Accept PDF files.
3. Validate the selected file.
4. Request a presigned R2 upload URL.
5. Upload the PDF directly from the browser to R2.
6. Create local metadata in IndexedDB.
7. Open the reader.

The PDF must never pass through the application Worker.

The Worker only signs the request.

---

# 7. Mobile-First Requirement

The application must be designed **phone-first**.

Do NOT design desktop first and then shrink the interface.

Priority:

```text
Phone
 ↓
Tablet
 ↓
Desktop
```

The reader should feel natural on:

* iPhone.
* Android phones.
* Tablets.
* Desktop browsers.

---

# 8. Primary Mobile UX

The application should have very little UI.

The user should primarily see:

```text
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│         BOOK PAGE           │
│                             │
│                             │
│                             │
│                             │
│          47 / 182           │
│                             │
└─────────────────────────────┘
```

The book is the hero.

Everything else should disappear when not needed.

---

# 9. Home / Library

The initial screen is the user's library.

Show:

* Existing books.
* Book cover/first-page preview.
* Book title.
* Reading progress.
* Current page.

Primary action:

**Open PDF**

Do not overload the home screen with settings or complicated navigation.

---

# 10. Opening a Book

When a user taps a book:

```text
Library
 ↓
Open book
 ↓
Load PDF
 ↓
Display current page
```

If the user previously read page 47:

```text
Resume at page 47
```

If the book is new:

```text
Start at page 1
```

---

# 11. Reader Design

The reader should occupy almost the entire viewport.

The UI should be visually quiet.

The page should have:

* Appropriate margins.
* Soft surrounding background.
* Subtle depth.
* Strong typography.
* Excellent readability.

The exact colors, typography, shadows, radii, and components must come from the provided design system.

---

# 12. Page Number

Always provide a subtle page indicator.

Example:

```text
47 / 182
```

It should not dominate the interface.

Position it where it is visually comfortable and consistent with the supplied design system.

The user should always understand:

> Where am I in the book?

---

# 13. Page Turning Is a Core Feature

**Page flipping must look and feel like an actual book.**

Do not implement a basic:

```text
opacity: 0
→
opacity: 1
```

transition.

Do not simply slide pages horizontally.

The page transition should visually communicate a **sheet turning over**.

---

# 14. Page Flip Behavior

When the user swipes:

```text
Swipe left
     ↓
Page physically turns
     ↓
Next page revealed
```

When swiping backward:

```text
Swipe right
     ↓
Previous page physically turns back
```

The animation direction must correspond to navigation direction.

---

# 15. Page Flip Animation Requirements

The page-turn animation should have:

* Perspective.
* Rotation around an appropriate page edge.
* Natural acceleration/deceleration.
* Visible page movement.
* Correct front/back page behavior.
* Subtle depth.
* Appropriate shadow during the turn.
* No excessive bounce.
* No cartoon-like effects.

Use **Framer Motion** for animation orchestration.

The animation should feel:

**physical, elegant, smooth, and premium.**

---

# 16. Interactive Page Turning

The page turn should ideally respond to the user's gesture.

Do not wait for:

```text
swipe complete
→
play fixed animation
```

Instead:

```text
finger moves
 ↓
page follows gesture
 ↓
user releases
 ↓
determine whether to complete/reverse
```

Example:

```text
User drags page 35% across screen
                 ↓
Release
        ┌────────┴────────┐
        ↓                 ↓
    insufficient       sufficient
       drag               drag
        ↓                 ↓
    snap back          complete flip
```

This makes the interaction feel tactile rather than like a slideshow.

---

# 17. Gesture Threshold

Use a sensible swipe threshold based on viewport width and velocity.

A slow short swipe should not accidentally change pages.

A deliberate fast swipe should be able to turn the page without requiring a huge movement.

The threshold must be tuned on actual mobile devices.

---

# 18. Page Flip During Fast Navigation

Rapid swiping must not break the reader.

Prevent:

* Page order corruption.
* Multiple transitions fighting each other.
* Incorrect current page.
* Annotation layers appearing on the wrong page.

Navigation state must remain authoritative.

---

# 19. Page Rendering

Conceptually each page consists of:

```text
┌─────────────────────┐
│ PDF content         │
├─────────────────────┤
│ Text selection      │
├─────────────────────┤
│ Highlight layer     │
├─────────────────────┤
│ Drawing layer       │
└─────────────────────┘
```

The PDF itself remains untouched.

---

# 20. Page Loading

Do not render all 100+ pages as active interactive surfaces simultaneously.

Prioritize:

```text
Previous page
Current page
Next page
```

Additional pages can be prepared lazily.

The current page always receives highest priority.

---

# 21. PDF Loading

When a book opens:

1. Retrieve its R2 object URL.
2. Load the PDF.
3. Determine page count.
4. Render the current page.
5. Prepare adjacent pages.
6. Restore annotations.
7. Restore reading position.

The reader should avoid blocking the entire UI while preparing distant pages.

---

# 22. Annotation Architecture

Annotations are stored separately from the PDF.

```text
R2
└── original.pdf

IndexedDB
├── highlights
├── drawings
├── bookmarks
└── reading position
```

This is critical.

Never rewrite or regenerate the PDF when the user annotates it.

---

# 23. Highlighting

The user can select text and highlight it.

Available highlight colors should include several visually distinct choices.

Example:

```text
Yellow
Pink
Green
Blue
```

The exact colors must come from the design system.

---

# 24. Highlight UX

When text is selected, show a compact contextual action.

Example:

```text
Highlight
```

Selecting it applies the current highlight color.

The user should be able to change colors without leaving the reading experience.

---

# 25. Highlight Persistence

Every highlight must remember:

* Book ID.
* Page number.
* Highlight color.
* Position/range.
* Relevant text metadata where useful.

The highlight must remain correctly aligned when:

* Page is resized.
* Device orientation changes.
* Browser dimensions change.
* Zoom changes.

---

# 26. Doodling

The user can enter drawing mode.

Drawing must feel immediate.

When the user touches the page:

```text
finger / stylus
      ↓
ink appears immediately
```

No noticeable latency.

---

# 27. Drawing Tools

MVP drawing tools:

* Pen.
* Color selector.
* Stroke width.
* Eraser.
* Undo.
* Redo.

Keep the toolbar compact.

Do not turn the application into a full illustration application.

---

# 28. Drawing Data

Store drawing strokes rather than screenshots.

Conceptually:

```text
drawing
├── bookId
├── page
├── color
├── width
└── strokes
    ├── point
    ├── point
    └── point
```

Coordinates must be normalized relative to the PDF page.

Do NOT store raw screen coordinates.

Example:

```text
x: 0.42
y: 0.67
```

rather than:

```text
x: 382px
y: 714px
```

This keeps drawings aligned when the page is resized.

---

# 29. Drawing and Page Turning

When drawing mode is active:

**page turning must be disabled.**

This is essential.

The application must never interpret a drawing stroke as a page swipe.

When the user exits drawing mode:

Normal page gestures return.

---

# 30. Highlight and Drawing Independence

Highlighting and doodling must be separate interaction modes.

```text
Read
Highlight
Draw
Erase
```

The user must always understand what their finger/stylus will do.

---

# 31. Undo / Redo

Support:

* Undo highlight.
* Undo drawing.
* Undo erasing.
* Redo these operations.

Navigation should not be part of undo history.

---

# 32. Bookmarks

Users can bookmark a page.

Bookmarking should be one tap.

The bookmark state must persist in IndexedDB.

A user should be able to return to bookmarked pages.

---

# 33. Reading Progress

Store:

```text
currentPage
progress
lastOpenedAt
```

When reopening:

```text
Continue reading
```

from the previous location.

---

# 34. Minimal Reader Controls

The reader should expose only necessary controls.

Recommended:

```text
Page number

Back / Library
Bookmark
Annotation
```

Additional controls can appear contextually.

Avoid permanent toolbars covering the book.

---

# 35. Tap-to-Reveal Controls

Controls should be able to hide while reading.

On mobile:

```text
Tap page
    ↓
Controls appear
```

Tap again or wait:

```text
Controls disappear
```

The reading surface should remain unobstructed.

---

# 36. Mobile Orientation

Support:

* Portrait.
* Landscape.

When orientation changes:

* Recalculate page dimensions.
* Recalculate annotation coordinates.
* Preserve current page.
* Preserve current reading position.
* Preserve drawings.

---

# 37. Responsive Page Sizing

The page must maintain the PDF's aspect ratio.

Never stretch a page.

The page should scale proportionally to the available reading area.

---

# 38. Touch Interaction

Touch must be treated as a first-class interaction.

Support:

* Swipe page.
* Tap controls.
* Long press/select text where browser capabilities allow.
* Pinch zoom.
* Drawing.
* Erasing.

Do not build a desktop mouse interface and merely attach touch events afterward.

---

# 39. Stylus

Where a device supports stylus input:

* Treat pen input as drawing when Draw mode is active.
* Preserve pressure data if useful.
* Do not require stylus users to use mouse-like interactions.

Pointer Events provide a unified input model for mouse, touch, and pen.

---

# 40. Zoom

Support:

* Pinch-to-zoom.
* Zoom reset.

Zoom must preserve:

* PDF alignment.
* Highlights.
* Drawings.

Zoom should not accidentally trigger page navigation.

---

# 41. Library Simplicity

The application should NOT become a complicated ebook manager.

The library only needs to answer:

> What books do I have, and which one do I want to read?

---

# 42. Book Card

Each book should show:

```text
Cover
Title
Progress
Current page
```

Example:

```text
┌──────────────┐
│              │
│    COVER     │
│              │
└──────────────┘

The Great Gatsby
47 / 180
```

The exact presentation comes from the design system.

---

# 43. Delete Book

Deleting a book should remove:

* R2 PDF.
* IndexedDB metadata.
* Highlights.
* Drawings.
* Bookmarks.
* Reading progress.

Require confirmation.

---

# 44. R2 Object Lifecycle

Each book should have a stable object identifier.

Example:

```text
books/{bookId}/original.pdf
```

Never use the user's filename as the sole identifier.

Two books may have the same filename.

---

# 45. R2 Storage

Use R2 Standard storage for normal books.

Current R2 Standard pricing includes:

* 10 GB-month free storage.
* 1M Class A operations/month free.
* 10M Class B operations/month free.
* Free internet egress.

R2 Standard has no minimum storage duration.

R2 supports unlimited objects per bucket and objects up to 5 TiB, although the application's practical limits should be much lower for UX reasons.

---

# 46. Upload Security

The React application must never contain permanent R2 credentials.

Use:

```text
POST /sign-upload
```

on the minimal Cloudflare Worker.

The Worker generates a short-lived presigned `PUT` URL.

The browser uploads directly to R2.

For reading:

```text
React
 ↓
Worker
 ↓
signed GET URL
 ↓
R2
 ↓
Browser
```

Presigned URLs can be limited to a specific object and operation and expire after a configured duration.

---

# 47. R2 CORS

Configure R2 CORS to allow the application's origin.

At minimum, configure the methods actually used by the application, such as:

```text
GET
PUT
HEAD
```

and the required headers.

Cloudflare explicitly requires appropriate CORS configuration for browser requests to R2 presigned URLs.

---

# 48. Offline Behavior

The application should distinguish:

### Local reading state

Stored locally:

* Highlights.
* Drawings.
* Bookmarks.
* Progress.
* Metadata.

### Cloud document

Stored in R2:

* Original PDF.

If the PDF is already cached locally, the user should be able to continue reading it when temporarily offline.

Do not pretend that a never-downloaded R2 PDF can magically be opened without connectivity.

---

# 49. Local PDF Cache

For excellent mobile UX, cache recently opened PDF data locally where practical.

This is separate from the canonical R2 copy.

Conceptually:

```text
R2
 ↓
Browser cache/local storage layer
 ↓
Reader
```

The R2 object remains the source of truth.

Annotations remain IndexedDB data.

---

# 50. Error States

Handle:

### Upload failure

> Couldn't upload this book. Check your connection and try again.

### PDF loading failure

> This book couldn't be opened.

### R2 unavailable

> Your book couldn't be loaded right now.

### Storage failure

> Your changes couldn't be saved locally.

### Invalid PDF

> This file isn't a valid PDF.

Never show raw stack traces to users.

---

# 51. Performance

The reader must feel instantaneous.

Prioritize:

1. Current page.
2. Next page.
3. Previous page.
4. Annotation rendering.
5. Remaining pages.

Do not unnecessarily decode/render the entire PDF simultaneously.

---

# 52. Memory Management

Mobile devices have significantly less available memory than desktops.

Avoid keeping hundreds of fully rendered page canvases alive.

Dispose of distant page rendering resources when no longer necessary.

The reader should maintain only the resources required for nearby pages.

---

# 53. Animation Performance

Page flipping must remain smooth.

Animations should avoid unnecessary React rerenders.

Animation state should be kept as close as possible to the interactive reader layer.

Framer Motion should handle animation orchestration.

Do not animate massive React component trees unnecessarily.

---

# 54. Reduced Motion

Respect:

```text
prefers-reduced-motion
```

If enabled:

* Reduce page rotation.
* Reduce transition duration.
* Remove unnecessary movement.

The reader must remain functional.

---

# 55. Aesthetic Direction

The application is intentionally being designed for a **book-reading audience with a softer, elegant visual character**.

Do NOT interpret this as:

* childish.
* overly pink.
* glittery.
* overly feminine.
* decorative for the sake of decoration.

Instead aim for:

**Elegant + warm + beautiful + intimate + premium.**

Think:

```text
quiet reading room
+
beautiful stationery
+
modern mobile interface
```

The actual colors and visual tokens come from the supplied design system.

---

# 56. Visual Hierarchy

The hierarchy must be:

```text
BOOK
 ↓
PAGE
 ↓
READING
 ↓
ANNOTATION
 ↓
CONTROLS
```

Not:

```text
TOOLBAR
 ↓
BUTTONS
 ↓
SIDEBAR
 ↓
BOOK
```

The book always wins.

---

# 57. Typography

Typography should prioritize:

* Comfortable reading.
* Strong hierarchy.
* Excellent mobile legibility.
* Appropriate line height.
* Minimal UI text.

Do not allow application UI typography to interfere with the PDF itself.

The PDF's own typography must remain untouched.

---

# 58. Navigation

Use React Router.

Suggested routes:

```text
/
    Library

/read/:bookId
    Reader

/settings
    Settings
```

The reader route must survive browser refreshes.

The book must be retrieved from local metadata and R2.

---

# 59. State Separation

Separate:

### Persistent state

```text
books
annotations
bookmarks
progress
settings
```

from:

### Temporary interaction state

```text
current gesture
pointer position
page drag amount
page animation
current drawing stroke
toolbar visibility
zoom gesture
```

Do not put PDF binary data into frequently changing React state.

---

# 60. Automatic Annotation Saving

During drawing:

```text
Pointer movement
      ↓
In-memory stroke
      ↓
Immediate visual rendering
      ↓
Pointer released
      ↓
Persist completed stroke
```

Do NOT write every pointer coordinate to IndexedDB.

---

# 61. Book Open Flow

Exact flow:

```text
APP OPENS
   ↓
LIBRARY
   ↓
USER SELECTS BOOK
   ↓
LOAD BOOK METADATA
   ↓
OBTAIN R2 ACCESS
   ↓
LOAD PDF
   ↓
RESTORE CURRENT PAGE
   ↓
RESTORE ANNOTATIONS
   ↓
DISPLAY BOOK
```

The user should not be exposed to this complexity.

---

# 62. Reader Interaction Flow

Normal reading:

```text
Open page
    ↓
Read
    ↓
Swipe
    ↓
Page flips
    ↓
Continue reading
```

Highlight:

```text
Select text
    ↓
Highlight action
    ↓
Choose/apply color
    ↓
Highlight saved
```

Doodle:

```text
Open annotation tools
    ↓
Draw mode
    ↓
Draw
    ↓
Exit draw mode
    ↓
Continue reading
```

---

# 63. Page Flip Acceptance Criteria

The page flip is considered successful only if:

* The direction is correct.
* The gesture feels physically connected to the page.
* The next page is revealed naturally.
* The page does not simply slide.
* The animation is smooth on mobile.
* Rapid navigation doesn't break state.
* Drawing mode cannot accidentally trigger a flip.
* Page number updates correctly.
* Highlights/drawings appear on the correct page.

---

# 64. Mobile Acceptance Criteria

On a phone:

* The book occupies most of the screen.
* The page number remains readable.
* Controls do not permanently obstruct reading.
* Swipe navigation works naturally.
* Drawing works with touch.
* Pinch zoom works.
* Orientation changes don't break annotations.
* Page flips remain smooth.
* The UI remains usable with one hand where practical.

---

# 65. MVP

The first production version must include:

### Library

* PDF import.
* R2 upload.
* Book cards.
* Book opening.
* Delete book.

### Reader

* PDF rendering.
* Mobile-first layout.
* Page number.
* Swipe navigation.
* Interactive page flipping.
* Previous/next navigation.
* Reading progress.

### Annotation

* Text selection.
* Multiple highlight colors.
* Highlight persistence.
* Drawing.
* Drawing colors.
* Stroke width.
* Eraser.
* Undo.
* Redo.

### Persistence

* IndexedDB.
* Automatic saving.
* Local annotation restoration.
* Reading position restoration.

### Infrastructure

* R2 PDF storage.
* Secure presigned URLs.
* R2 CORS.
* Minimal signing Worker.

---

# 66. Explicitly Do Not Build Yet

Do NOT build:

* Social features.
* Comments.
* Collaboration.
* AI chat.
* AI summaries.
* Reading statistics.
* Payments.
* Subscriptions.
* User profiles.
* Public book sharing.
* Book marketplace.
* EPUB support.
* Audiobooks.
* DRM.
* Complex note-taking.
* Full PDF editing.
* Cloud annotation synchronization.

The product should stay focused.

---

# 67. The Product's Core Promise

The entire application should communicate one idea:

> **Open your book. Turn the page. Read.**

The PDF is merely the source format.

The user should forget that they're technically reading a PDF.

They should experience:

**a beautiful digital book with real page-turning, personal highlights, and handwritten doodles.**

That is the product.
