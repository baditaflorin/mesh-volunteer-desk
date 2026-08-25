async function closeInitiallyOpenSettings(page) {
  const settings = page.getByRole("dialog", { name: "Settings" });
  if (!(await settings.isVisible().catch(() => false))) return;
  const close = settings.getByRole("button", { name: "close" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
}

async function joinDesk(page, name) {
  await closeInitiallyOpenSettings(page);
  await page.getByLabel("Your working name").fill(name);
  const join = page.locator(".primary-desk-action");
  await join.waitFor({ state: "visible" });
  await join.click();
  await page.getByRole("heading", { name: "Volunteer Desk" }).waitFor();
}

export default async function volunteerDeskScenario(a, b) {
  await Promise.all([joinDesk(a, "Avery"), joinDesk(b, "Rowan")]);
  await a.waitForTimeout(900);

  await a.getByPlaceholder("e.g. North gate check-in").fill("North gate check-in");
  await a.getByRole("button", { name: "Add assignment" }).click();
  await b.getByText("North gate check-in", { exact: true }).waitFor();
  await b.getByTestId("claim-next-assignment").click();

  await b.getByRole("button", { name: "Complete assignment" }).waitFor();
  await a.waitForTimeout(5200);
}
