import {
  renderHome,
  renderLocation,
  renderService,
  renderConfirm
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
    default:
    renderHome();
  }
}

window.navigate = navigate;
