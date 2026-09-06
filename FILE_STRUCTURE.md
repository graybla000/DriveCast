# DriveCast — base44 project structure (historical)

> **This is a point-in-time record of the original base44 export, kept for
> provenance — it no longer describes the current tree.** base44 was removed on
> 2026-09-06: the SDK, Vite plugin, hosted auth pages, `base44/`, and
> `src/api/base44Client.js` are all gone. See `README.md` and `AGENTS.md` for
> how the project is laid out now. The extraction notes below are still worth
> keeping for the Monaco gotcha they document.

Extracted from the base44 editor file tree on 2026-09-06.

- **App:** DriveCast (Copy)
- **App ID:** `6a9db3a29687481d5af164d3`
- **Editor URL:** https://app.base44.com/apps/6a9db3a29687481d5af164d3/editor/workspace/code
- **Original app ID:** `6a9d0613586cc3c4a70dd348` (this app is a copy of it)
- **Description:** Transform your drives into journeys of discovery with curated podcasts, hidden roadside attractions, and personalized trip planning tailored to your route and interests.
- **Totals:** 113 files across 10 directories (123 tree nodes)

## Stack

Vite + React (JSX), Tailwind CSS, shadcn/ui component library, React Router v6,
React Query (`query-client.js`), base44 SDK via `src/api/base44Client.js`.

## Routes (from app metadata)

| Path | Component |
| --- | --- |
| `/` | `src/pages/Home.jsx` |
| `/explore` | `src/pages/Explore.jsx` |
| `/plan` | `src/pages/TripPlanner.jsx` |
| `/favorites` | `src/pages/Favorites.jsx` |

Page names registered: Explore, Favorites, ForgotPassword, Home, Login,
OAuthConsent, Profile, Register, ResetPassword, TripPlanner.

## Tree

```
DriveCast/
├── base44/
│   ├── entities/
│   │   └── User.jsonc
│   └── config.jsonc
├── src/
│   ├── api/
│   │   └── base44Client.js
│   ├── components/
│   │   ├── ui/                        # 51 shadcn/ui primitives
│   │   │   ├── accordion.jsx
│   │   │   ├── alert-dialog.jsx
│   │   │   ├── alert.jsx
│   │   │   ├── aspect-ratio.jsx
│   │   │   ├── avatar.jsx
│   │   │   ├── badge.jsx
│   │   │   ├── breadcrumb.jsx
│   │   │   ├── button.jsx
│   │   │   ├── calendar.jsx
│   │   │   ├── card.jsx
│   │   │   ├── carousel.jsx
│   │   │   ├── chart.jsx
│   │   │   ├── checkbox.jsx
│   │   │   ├── collapsible.jsx
│   │   │   ├── command.jsx
│   │   │   ├── context-menu.jsx
│   │   │   ├── dialog.jsx
│   │   │   ├── drawer.jsx
│   │   │   ├── dropdown-menu.jsx
│   │   │   ├── form.jsx
│   │   │   ├── hover-card.jsx
│   │   │   ├── image-helpers.js
│   │   │   ├── image.jsx
│   │   │   ├── input-otp.jsx
│   │   │   ├── input.jsx
│   │   │   ├── label.jsx
│   │   │   ├── menubar.jsx
│   │   │   ├── navigation-menu.jsx
│   │   │   ├── pagination.jsx
│   │   │   ├── popover.jsx
│   │   │   ├── progress.jsx
│   │   │   ├── radio-group.jsx
│   │   │   ├── resizable.jsx
│   │   │   ├── scroll-area.jsx
│   │   │   ├── select.jsx
│   │   │   ├── separator.jsx
│   │   │   ├── sheet.jsx
│   │   │   ├── sidebar.jsx
│   │   │   ├── skeleton.jsx
│   │   │   ├── slider.jsx
│   │   │   ├── sonner.jsx
│   │   │   ├── switch.jsx
│   │   │   ├── table.jsx
│   │   │   ├── tabs.jsx
│   │   │   ├── textarea.jsx
│   │   │   ├── toast.jsx
│   │   │   ├── toaster.jsx
│   │   │   ├── toggle-group.jsx
│   │   │   ├── toggle.jsx
│   │   │   ├── tooltip.jsx
│   │   │   └── use-toast.jsx
│   │   ├── AppLayout.jsx
│   │   ├── AuthLayout.jsx
│   │   ├── BottomNav.jsx
│   │   ├── CategoryCard.jsx
│   │   ├── CategoryIcon.jsx
│   │   ├── ContinueListeningBar.jsx
│   │   ├── FilterPills.jsx
│   │   ├── FiltersSheet.jsx
│   │   ├── GoogleIcon.jsx
│   │   ├── ItemRow.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── RecommendationCard.jsx
│   │   ├── ScrollToTop.jsx
│   │   ├── SearchBar.jsx
│   │   ├── SurpriseMeCard.jsx
│   │   ├── SurpriseResultSheet.jsx
│   │   ├── TopBar.jsx
│   │   └── UserNotRegisteredError.jsx
│   ├── hooks/
│   │   ├── use-mobile.jsx
│   │   ├── use-size.jsx
│   │   ├── useContinueListening.js
│   │   ├── useFavorites.js
│   │   ├── useLocalStorage.js
│   │   ├── useTheme.js
│   │   └── useTrips.js
│   ├── lib/
│   │   ├── app-params.js
│   │   ├── AppStore.jsx
│   │   ├── AuthContext.jsx
│   │   ├── authReturnTo.js
│   │   ├── contentData.js
│   │   ├── PageNotFound.jsx
│   │   ├── query-client.js
│   │   └── utils.js
│   ├── pages/
│   │   ├── Explore.jsx
│   │   ├── Favorites.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── OAuthConsent.jsx
│   │   ├── Profile.jsx
│   │   ├── Register.jsx
│   │   ├── ResetPassword.jsx
│   │   └── TripPlanner.jsx
│   ├── utils/
│   │   └── index.ts
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── components.json
├── eslint.config.js
├── index.html
├── jsconfig.json
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── vite.config.js
```

## Notes on features implied by the file names

- **Content discovery:** `contentData.js`, `CategoryCard`, `CategoryIcon`,
  `RecommendationCard`, `ItemRow`, `FilterPills`, `FiltersSheet`, `SearchBar`
- **Audio/podcast playback:** `ContinueListeningBar`, `useContinueListening`
- **Trip planning:** `TripPlanner.jsx`, `useTrips.js`
- **Serendipity feature:** `SurpriseMeCard`, `SurpriseResultSheet`
- **Auth:** `AuthContext`, `AuthLayout`, `ProtectedRoute`, `authReturnTo`,
  `OAuthConsent`, `GoogleIcon`, `UserNotRegisteredError`, plus Login/Register/
  ForgotPassword/ResetPassword pages
- **Mobile-first:** `BottomNav`, `use-mobile`, heavy Sheet/Drawer usage

## Extraction method

The base44 API refuses bulk source reads:

```
GET /api/apps/<id>/code   →  412  "App does not support direct file reads"
GET /api/apps/<id>        →  200  (metadata only: name, routes, page_names)
```

**Paths** came from the editor DOM: every node in `[role="treeitem"]` carries
its full path in `data-file-id` (files) or `data-group-id` (folders), with depth
in `aria-level`.

**Contents** came from the Monaco editor. Clicking a tree node loads that file
into a model whose `getValue()` returns the full text. The editor keeps only one
model at a time, replacing it on each switch.

### The race worth knowing about

A naive "click, then poll until a model matching this path exists" loop reads the
**previous** file's text: Monaco creates the model at the new path *before*
swapping the content in. A first pass built this way silently mis-filed 64 of 113
files — `package.json` held `jsconfig.json`, `index.html` held `eslint.config.js`,
and 20 pairs of adjacent files were byte-identical. It looked completely normal.

The working approach waits until the content is **stable across two polls** *and*
**differs from the previously read file**, then verifies each file (structural
checks for configs, name-mention for components/pages/hooks) and re-reads any
failures — clicking a different file first to force a real model swap.

Verified after extraction: 113/113 files, 0 duplicate contents, all 5 JSON files
parse, per-directory counts match the tree above.

### Local build note

On a machine whose npm points at a private registry mirror rather than public
npmjs, `npm install` fails until that registry's auth token is refreshed.
