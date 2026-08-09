// Web Suite Pro - Background Service Worker for Brave & Chrome Side Panel Support

// Automatically configure click on Action icon to open Side Panel natively on Brave & Chrome
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  if (chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  if (chrome.action && chrome.action.onClicked) {
    chrome.action.onClicked.addListener((tab) => {
      if (tab && tab.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      }
    });
  }
}
