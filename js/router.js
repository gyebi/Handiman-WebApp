import {
  renderHome,
  renderLocation,
  renderService,
  renderConfirm,
  renderSubmitted
} from "./screens.js";


export function navigate(screen) {
  console.log("Navigating to:", screen);
  
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
