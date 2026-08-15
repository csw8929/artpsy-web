#!/usr/bin/env node
// AX 트리 확인 — CDP Accessibility 도메인으로 "브라우저가 접근성 트리에 무엇을
// 올렸는가"만 본다 (AX-TREE-DEVICE). smoke의 한 갈래다 — L2 가 "그 템플릿이 골렸나"를
// 보듯, 이건 "그 요소가 접근성 트리에 이름을 갖고 올라갔나"를 본다.
//
// **이 장치가 안 잡는 것**: 스크린리더가 실제로 무엇을 읽어 주는지(브라우저·스크린리더
// 조합마다 낭독 규칙이 트리와 다를 수 있다), 낭독 순서, 키보드 초점 이동 경험, 실제
// 보조기기 동작. 초록불이 "접근성 확인됨"을 뜻하지 않는다 — "AX 트리에 이렇게
// 올라간다"까지다. 그래서 이름에 "접근성"·"a11y"를 안 쓰고 "AX 트리"를 쓴다.
//
// 하네스가 이미 쓰는 CDP 클라이언트를 그대로 가져온다 — puppeteer 등 새 의존을 안 붙인다.
import { launchChrome, killChrome, newPage, sleep } from "../../MyPrivate/tools/perf-harness/cdp.mjs";

const BASE = process.env.WP_BASE_URL ?? "http://localhost:8888";

// 검사 대상 요소 수를 하드코딩해 단언한다. 0개 모으고 "전부 통과"가 되는 것이 이런
// 장치의 공통 구멍이다 (ROUTES/EXPECTED_ROUTE_COUNT와 같은 이유).
const EXPECTED_FORM_FIELD_COUNT = 4;

async function goto(page, path, ms = 1200) {
  const loaded = new Promise((r) => page.on("Page.loadEventFired", r));
  await page.send("Page.navigate", { url: new URL(path, BASE).toString() });
  await loaded;
  await sleep(ms);
}

async function axNodeFor(page, selector) {
  const { root } = await page.send("DOM.getDocument", { depth: -1, pierce: true });
  const { nodeId } = await page.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  if (!nodeId) return null;
  const { nodes } = await page.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
  const node = nodes[0];
  if (!node) return null;
  return { name: node.name?.value ?? "", role: node.role?.value ?? null };
}

async function checkFormFieldNames(page) {
  // 1. /contact/ 의 입력 넷이 각각 비어 있지 않은 접근 이름을 갖는다.
  // <label for> 가 마크업에 있는 것과 이름이 실제로 계산되는 것은 다르다 — 그래서 트리를 본다.
  const selectors = ["#artpsy-name", "#artpsy-email", "#artpsy-message", "#artpsy-consent"];
  if (selectors.length !== EXPECTED_FORM_FIELD_COUNT) {
    return [`검사 대상이 ${selectors.length}개인데 EXPECTED_FORM_FIELD_COUNT는 ${EXPECTED_FORM_FIELD_COUNT}다.`];
  }

  await goto(page, "/contact/");
  const failures = [];
  for (const selector of selectors) {
    const node = await axNodeFor(page, selector);
    if (!node) {
      failures.push(`${selector} 를 AX 트리에서 못 찾았다.`);
      continue;
    }
    if (!node.name.trim()) {
      failures.push(`${selector} 의 AX 이름이 비어 있다 (role: ${node.role}).`);
    } else {
      console.log(`OK  ${selector} AX 이름 = "${node.name}"`);
    }
  }
  return failures;
}

async function checkConsentNameIncludesPolicyLink(page) {
  // 2. 동의 체크박스의 이름에 처리방침 링크 텍스트가 딸려 온다.
  // 라벨 안에 <a> 가 있는 구조라 이름이 어떻게 합쳐지는지가 마크업만 봐서는 안 보인다.
  await goto(page, "/contact/");
  const node = await axNodeFor(page, "#artpsy-consent");
  if (!node) return ["#artpsy-consent 를 AX 트리에서 못 찾았다."];
  if (!node.name.includes("개인정보 처리방침")) {
    return [`동의 체크박스의 AX 이름에 "개인정보 처리방침"이 없다: "${node.name}"`];
  }
  console.log(`OK  동의 체크박스 AX 이름에 처리방침 링크 텍스트 포함 — "${node.name}"`);
  return [];
}

async function checkSuccessIsLiveRegion(page) {
  // 3. 성공 문구(PRG 뒤)가 라이브 리전으로 잡힌다. role="status" 가 마크업에 있는 것과
  // 트리에 잡히는 것은 다르다 — DB 에 쓰지 않고 리다이렉트 목적지로 바로 가서 본다.
  //
  // status 역할 자체의 AX 이름은 원래 비어 있는 게 정상이다(aria-label 류가 없으면) —
  // 실측해 보니 값은 live 속성과 자식 StaticText 에 있었다. 그래서 이름이 아니라
  // (a) live 속성이 붙었는가 (b) 자식에 실제 텍스트가 있는가를 본다.
  await goto(page, "/contact/?artpsy_sent=1");
  const { root } = await page.send("DOM.getDocument", { depth: -1, pierce: true });
  const { nodeId } = await page.send("DOM.querySelector", { nodeId: root.nodeId, selector: ".contact-form__sent" });
  if (!nodeId) return [".contact-form__sent 를 AX 트리에서 못 찾았다."];

  const { nodes } = await page.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: true });
  const statusNode = nodes.find((n) => n.nodeId && n.backendDOMNodeId && n.role?.value === "status");
  if (!statusNode) return [`.contact-form__sent 의 AX role이 "status"가 아니다.`];

  const live = (statusNode.properties ?? []).find((p) => p.name === "live");
  if (!live || live.value?.value !== "polite") {
    return [`.contact-form__sent 에 live="polite" 속성이 없다 — 실제 값: ${JSON.stringify(live)}`];
  }

  const child = nodes.find((n) => n.parentId === statusNode.nodeId);
  const childText = child?.name?.value ?? "";
  if (!childText.trim()) {
    return ["성공 문구의 자식 텍스트 노드가 비어 있다 — 내용이 트리에 안 올라간다."];
  }

  console.log(`OK  성공 문구 role="status" · live="polite" · 내용 = "${childText}"`);
  return [];
}

async function main() {
  const chrome = await launchChrome({ profile: "/tmp/chrome-ax-tree-profile" });
  const failures = [];
  try {
    const page = await newPage();
    await page.send("Page.enable");
    await page.send("DOM.enable");
    await page.send("Accessibility.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    failures.push(...(await checkFormFieldNames(page)));
    failures.push(...(await checkConsentNameIncludesPolicyLink(page)));
    failures.push(...(await checkSuccessIsLiveRegion(page)));

    await page.close();
  } catch (err) {
    failures.push(`AX 트리 확인 중 실패했다 — wp-env 가 안 떠 있을 수 있다: ${err.message}`);
  } finally {
    killChrome(chrome.pid);
  }

  if (failures.length > 0) {
    console.error("\n실패:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nAX 트리 확인 3건 통과. (스크린리더 실측·낭독 순서·초점 이동은 이 장치가 안 잡는다.)");
}

main();
