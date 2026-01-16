

import {
  renderHome,
  renderLocation,
  renderService,
  renderConfirm,
  renderSubmitted,
} from "./screens.js";

//import { stopRequestListener } from "./handiman.js";
import { handleNavigationCleanup } from "./handiman.js";

let currentScreen = null;

export function navigate(screen) {
  console.log("Navigating to:", screen);
  
  // ✅ Stop listener ONLY if leaving tracking screen
   if (currentScreen !== null) {
    handleNavigationCleanup(currentScreen, screen);
  }

  currentScreen = screen;
  

  switch (screen) {
    case "home":
      renderHome();
      break;
      
    case "location":
      renderLocation();
      break;

    case "service":
      renderService();
      break;

    case "confirm":
      renderConfirm();
      break;

    case "submitted":
      renderSubmitted();
      break;

    default:
    renderHome();
  }
}

window.navigate = navigate;
