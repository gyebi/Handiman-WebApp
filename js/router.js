function navigate(screen) {
  console.log("Navigating to:", screen);
  switch (screen) {
    case "home":
      renderHome();
      break;
      default:
        console.log("unknown screen");
    case "location":
      renderLocation();
      break;
    case "service":
      renderService();
      break;
    case "confirm":
      renderConfirm();
      break;
    renderHome();
  }
}
