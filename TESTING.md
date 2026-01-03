# Testing Instructions

## Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `extension` folder
5. Extension icon should appear in toolbar

## Quick Test

1. Click the extension icon to open dashboard
2. Click "Settings" button
3. Add a tracked site (e.g., "github.com")
4. Navigate to that site in a new tab
5. Wait 5-10 seconds
6. Click extension icon again
7. Verify time is being tracked

## Expected Behavior

- Dashboard shows "Today", "This Week", "This Month" summary
- Real-time tracking indicator shows current site
- Chart displays time series data
- Settings page allows adding/removing sites
- CSV export works

## Troubleshooting

Check background service worker console:
1. Go to `chrome://extensions`
2. Click "Inspect views: service worker" under the extension
3. Look for console messages starting with "Time Tracker:"

If no errors appear, the extension is working correctly.
