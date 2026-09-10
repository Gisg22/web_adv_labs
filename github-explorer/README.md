# GitHub Repository Explorer

A responsive application for exploring public GitHub repositories, built with semantic HTML5, CSS3 and vanilla JavaScript.

## Run locally

Open `index.html` in a modern browser. An internet connection is needed to retrieve repositories. No build step, dependencies or API key are required. A static web server can also serve this directory.

## Project structure

```text
github-explorer/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   └── favicon.svg
└── README.md
```

## Assignment checklist

1. **Project structure:** HTML, CSS, JavaScript and assets are separate.
2. **Semantic HTML:** `header`, `nav`, `main`, `section` and `footer`; Home, Search and About links navigate to their corresponding sections.
3. **Search form:** A labeled username input and submit button; HTML constraints and JavaScript validation prevent empty and invalid searches.
4. **REST API:** `fetch()` and `async/await` retrieve names, descriptions, languages, stars and URLs from the GitHub REST API.
5. **JSON and rendering:** JSON responses are processed into dynamically created repository cards using DOM methods. API text is inserted as text, never HTML.
6. **Loading:** A visible loading state includes progress during pagination and disappears after completion.
7. **Errors:** Messages cover invalid input, missing users, empty collections, network errors, timeouts, rate limits and unexpected responses.
8. **Filtering:** A JavaScript language filter is populated from the complete collection, including repositories with no detected language.
9. **Sorting:** Name A–Z/Z–A and stars high–low/low–high update the collection immediately.
10. **localStorage:** The last valid searched username is restored in the search field. Storage restrictions do not prevent searching.
11. **Responsive layout:** CSS Grid, Flexbox and media queries adapt the interface to desktop, tablet and mobile.
12. **UI:** Consistent spacing, clear typography, hover and focus states, repository cards, status messages, labeled controls and reduced-motion support.

## API behavior

The application requests up to 100 repositories per page and follows pagination until the full public collection is loaded. Filtering and sorting run locally without additional requests. Private repositories are not requested. Unauthenticated GitHub rate limits apply.

[GitHub REST API documentation](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)
