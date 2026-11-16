# Inventory Import Requirements

## Goal
Allow repair cafés to maintain inventory in a spreadsheet and import it via CSV while preserving existing QR scanning and confirmation features.

## Data Format
- CSV file with UTF-8 encoding
- Required columns: `id`, `name`, `category`, `bin`, `count`, `tags`
- Support comma and semicolon delimiters
- Handle quoted fields with embedded delimiters and doubled quotes
- Accept CRLF and LF line endings
- Strip UTF-8 BOM if present

## Validation
- Report invalid UTF-8 encoding
- Reject missing or extra headers
- Reject duplicate IDs
- Validate bin codes against `bins` registry (A-01 through B-03)
- Validate count as positive integer
- Enforce max file size (100 KB)
- Enforce max entries (200 items)

## User Flow
1. Show download button for sample CSV fixture
2. File input accepts .csv files
3. Parse and validate uploaded file
4. Preview: show item count and first 5 records
5. Require explicit confirmation to replace inventory
6. Cancel or validation error preserves existing inventory
7. Reset button restores demo inventory

## Browser State
- Store imported inventory in localStorage
- Restore on page reload
- Clear confirmation history on inventory change (incompatible IDs)
- Reset clears custom inventory and history

## Security
- Use text insertion only (textContent, not innerHTML)
- Validate all user input before processing
- Keep file processing client-side

## Testing
- Valid CSV with all features (quotes, CRLF, BOM)
- Malformed CSV (missing headers, invalid delimiter, encoding errors)
- Rejected CSV (duplicate IDs, invalid bins, oversized)
- Edge cases (empty file, single row, max entries)
