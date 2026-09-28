# Browser SQL Engine

> A zero-backend SQL engine executing parsing, table storage, and B-Tree indexing directly inside the browser DOM.

## Overview
Most web applications lean on external databases or heavy WebAssembly runtimes to evaluate queries. This project implements a core database architecture from scratch in Vanilla JavaScript, running entirely inside your browser tab without any native database binaries.

It parses query strings, transforms records into memory structures, maintains a custom B-Tree index for quick lookup, and synchronizes data directly to LocalStorage so state survives full browser refreshes.

## How it Works
1. **Query Parsing**: `app.js` runs regex-based pattern matching over standard input strings to handle `CREATE TABLE`, `INSERT INTO`, and `SELECT ... WHERE` conditions.
2. **Data Model**: The `Database` class holds named `Table` instances. Each table maintains raw row arrays alongside schema definitions.
3. **Indexing Strategy**: A custom order-4 B-Tree (`btree.js`) indexes the primary key column (the first defined column). Key insertions trigger node splitting to maintain logarithmic lookup depth.
4. **Condition Evaluation**: Where-clauses evaluate operators (`=`, `!=`, `>`, `<`, `>=`, `<=`) against cell values in real time.
5. **Persistence**: Every write operation (`CREATE`, `INSERT`) automatically serializes current tables and rows into LocalStorage, restoring state seamlessly on load.

## Key Features
* Custom order-4 B-Tree index implementation (`BTree` & `BTreeNode`) handling node splits and search passes.
* Browser-native SQL query processor covering basic DDL and DML operations.
* In-memory storage layer backed by browser LocalStorage persistence.
* Dynamic DOM rendering for queried dataset tables and execution feedback logs.

## Tech Stack Breakdown
* **Language**: Vanilla JavaScript (ES6+ classes, module-free DOM wiring)
* **Styling**: Modern CSS3 (CSS Grid/Flexbox layout, customized table borders)
* **Markup**: HTML5 (Clean input canvas and rendered result containers)
* **Storage Engine**: Browser `localStorage` API

## Quick Start (Browser-Only Setup)

### Option 1: GitHub Codespaces
1. Click the **Code** button at the top right of this repository.
2. Select **Codespaces** -> **Create codespace on main**.
3. Once loaded, launch the preview panel or serve `index.html` directly using the Live Preview extension.

### Option 2: GitHub Pages
1. Navigate to **Settings** -> **Pages**.
2. Set the source branch to `main` and save.
3. Access your live database interface at your generated GitHub Pages link.

### Option 3: Local Setup
1. Clone or download this repository.
2. Open `index.html` directly in any web browser. No `npm install` or build steps required.

## Repository Structure

```bash
browser-sql-engine/
├── .github/
│   └── workflows/
│       └── static-analysis.yml   # Code health check pipeline
├── .gitignore                    # Local editor and system exclusion rules
├── index.html                    # Application interface layout
├── style.css                     # Interface styling rules
├── btree.js                      # Custom B-Tree index data structure implementation
├── app.js                        # Database engine, SQL parser, and DOM integration
└── README.md                     # Project documentation
```

## Roadmap

* [ ] Support `DELETE FROM` and `UPDATE` SQL queries.
* [ ] Implement multi-column indexing across arbitrary secondary keys.
* [ ] Add `JOIN` query execution logic between relational tables.
* [ ] Expand B-Tree node order configuration directly through UI controls.
