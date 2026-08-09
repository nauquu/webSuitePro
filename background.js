// Web Suite Pro - Background Service Worker for Brave & Chrome Side Panel Support

// Set default action click to open Popup dropdown, sidePanel can be opened on demand
if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
}
