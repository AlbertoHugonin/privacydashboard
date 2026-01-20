# React migration status

The original UI is implemented with Vaadin Flow (server-side Java views in `src/main/java/com/privacydashboard/application/views`).

This folder contains the start of a React SPA intended to replace it.

## Implemented pages (React)

- `Login` (`/react/login`)
  - Uses Spring Security session login: `POST /login`
  - Uses `GET /api/user/me` to resolve the authenticated user
- `Home` (`/react/`)
- `Contacts` (`/react/contacts`)
  - `GET /api/user/getAllContacts?userId=<me.id>`
- `Messages` (`/react/messages`)
  - `GET /api/message/getAllMessagesFromUser?userId=<me.id>`
  - `POST /api/message/add` with `{ senderId, receiverId, text }`
- `Apps` (`/react/apps`)
  - `GET /api/user/getApps?userId=<me.id>`
- `Privacy Notice` (`/react/privacy-notice`)
  - `GET /api/privacynotice/getFromUser?userId=<me.id>`
  - `GET /api/privacynotice/getFromApp?appId=<appId>` (when `?appId=` is provided)
- `Rights` (`/react/rights`)
  - `GET /api/rightrequest/getAllFromUser?userId=<me.id>`
  - `POST /api/rightrequest/add` with `{ senderId, appId, rightType, details? }`
- `Questionnaire` (`/react/questionnaire`)
  - Minimal placeholder (lists apps + vote for Controller/DPO)

## Backend changes done for React

- Added `GET /api/user/me` to fetch the current user without needing a userId first.
- Added `contactId` to each conversation returned by `GET /api/message/getAllMessagesFromUser`.
- Fixed/extended the right-request delete mapping to also accept `api/rightrequest/delete`.

## Not migrated yet

- Profile modal (update password/mail, logout flow, delete user data).
- Notifications.
- “Available Apps” view (external Yggio integration).
- Full questionnaire UI and privacy notice creation/editing flows.

