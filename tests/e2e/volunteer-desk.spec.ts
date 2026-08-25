import { expect, test, type Locator, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

async function closeInitiallyOpenSettings(page: Page): Promise<void> {
  const settings = page.getByRole("dialog", { name: "Settings" });
  if (!(await settings.isVisible().catch(() => false))) return;
  const close = settings.getByRole("button", { name: "close" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(settings).toBeHidden();
}

async function enterDesk(page: Page, name: string): Promise<void> {
  await closeInitiallyOpenSettings(page);
  await page.getByLabel("Your working name").fill(name);
  const join = page.locator(".primary-desk-action");
  await expect(join).toBeEnabled({ timeout: 10_000 });
  await join.click();
  await expect(page.getByRole("heading", { name: "Volunteer Desk" })).toBeVisible();
}

function assignmentCard(page: Page, label: string): Locator {
  return page.locator(".assignment-card").filter({ hasText: label });
}

async function seedFastRoom(page: Page, room: string): Promise<void> {
  await page.addInitScript(
    ({ prefix, roomId }) => {
      localStorage.setItem(`${prefix}:room`, roomId);
      localStorage.setItem(`${prefix}:signalingUrl`, "ws://localhost:1/never-connects");
      localStorage.setItem(`${prefix}:turnTokenUrl`, "http://127.0.0.1:1/never-connects");
      localStorage.removeItem(`${prefix}:iceServers`);
    },
    { prefix: storagePrefix, roomId: room },
  );
}

async function expectInsideViewport(page: Page, target: Locator): Promise<void> {
  const viewport = page.viewportSize();
  const box = await target.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

test("two peers reserve seats and complete a shared assignment", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await Promise.all([enterDesk(a, "Avery"), enterDesk(b, "Rowan")]);

    await a.getByPlaceholder("e.g. North gate check-in").fill("North gate check-in");
    await a.getByRole("button", { name: "Add assignment" }).click();

    await expect(assignmentCard(b, "North gate check-in")).toBeVisible();
    const claim = b.getByTestId("claim-next-assignment");
    await expect(claim).toBeEnabled();
    await claim.click();

    await expect(b.getByRole("button", { name: "Complete assignment" })).toBeVisible();
    await expect(
      assignmentCard(a, "North gate check-in").getByText(/is covering it/),
    ).toBeVisible();

    await b.getByRole("button", { name: "Complete assignment" }).click();
    await expect(assignmentCard(a, "North gate check-in")).toHaveCount(0);
    await expect(assignmentCard(b, "North gate check-in")).toHaveCount(0);
  } finally {
    await cleanup();
  }
});

test("390x844 entry has no horizontal overflow and keeps the join action visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedFastRoom(page, "mobile-visual-contract");
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await closeInitiallyOpenSettings(page);

  const join = page.locator(".primary-desk-action");
  await expect(join).toBeEnabled({ timeout: 10_000 });
  await expectInsideViewport(page, join);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("1141x602 keeps the primary desk action above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 1141, height: 602 });
  await seedFastRoom(page, "desktop-visual-contract");
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await closeInitiallyOpenSettings(page);

  const join = page.locator(".primary-desk-action");
  await expect(join).toBeEnabled({ timeout: 10_000 });
  await expectInsideViewport(page, join);

  await join.click();
  const claim = page.getByTestId("claim-next-assignment");
  await expect(claim).toBeVisible();
  await expectInsideViewport(page, claim);
});
