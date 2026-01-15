import {
  renderHome,
  renderLocation,
  renderService,
  renderConfirm,
  renderSubmitted,
} from "./screens.js";

import { stopRequestListener } from "./handiman.js";



export function navigate(screen) {
  console.log("Navigating to:", screen);
  
  // Stop listening to request updates when leaving live-status screen
  stopRequestListener();

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
