"use strict";
const photo = document.getElementById("photo");
const cameraPhoto = document.getElementById("cameraPhoto");
const preview = document.getElementById("preview");
const question = document.getElementById("question");
const generate = document.getElementById("generate");
const hobbyInput = document.getElementById("hobby");
const loading = document.getElementById("loading");
const photoMessage = document.getElementById("photoMessage");
let selectedFiles = [];
let previewUrls = [];
let busy = false;
function getPhotoFiles(files = selectedFiles) {
  if (!files.length) throw new Error("写真を撮るか、アルバムから選んでください。");
  if (files.length > 5) throw new Error("写真は最大5枚までです。不要な写真を削除してください。");
  if (files.some(file => !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)))
    throw new Error("JPEG・PNG・GIF・WebPの写真を選んでください。HEICの場合はJPEGに変換してください。");
  if (files.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024)
    throw new Error("写真の合計を10MB以下にしてください。");
  return files;
}
function renderPhotos() {
  previewUrls.forEach(url => URL.revokeObjectURL(url));
  previewUrls = [];
  preview.replaceChildren();
  selectedFiles.forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    img.src = url;
    img.alt = "教材の写真 " + (index + 1);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "写真" + (index + 1) + "を削除";
    remove.disabled = busy;
    remove.addEventListener("click", () => {
      if (busy) return;
      selectedFiles.splice(index, 1);
      photoMessage.textContent = "";
      renderPhotos();
    });
    card.append(img, remove);
    preview.append(card);
  });
  document.getElementById("photoCount").textContent = selectedFiles.length
    ? selectedFiles.length + "／5枚 選択済み" : "写真はまだ選ばれていません";
}
for (const input of [photo, cameraPhoto]) {
  input.addEventListener("change", () => {
    if (!input.files.length || busy) return;
    try {
      const files = [...selectedFiles, ...Array.from(input.files)];
      getPhotoFiles(files);
      selectedFiles = files;
      photoMessage.textContent = "";
      renderPhotos();
    } catch (error) { photoMessage.textContent = error.message; }
    input.value = "";
  });
}
document.getElementById("takePhoto").addEventListener("click", () => cameraPhoto.click());
document.getElementById("choosePhoto").addEventListener("click", () => photo.click());
document.getElementById("begin").addEventListener("click", () => {
  document.getElementById("home").hidden = true;
  document.getElementById("builder").hidden = false;
  document.getElementById("builderTitle").focus();
});
document.getElementById("goHome").addEventListener("click", () => {
  document.getElementById("builder").hidden = true;
  document.getElementById("home").hidden = false;
  document.getElementById("begin").textContent = "問題づくりに戻る";
  document.getElementById("begin").focus();
});
function setBusy(value) {
  busy = value;
  for (const el of [generate, photo, cameraPhoto, hobbyInput,
    document.getElementById("takePhoto"), document.getElementById("choosePhoto"),
    ...preview.querySelectorAll("button")]) el.disabled = value;
  generate.textContent = value ? "作っています…" : "この写真から問題を作る";
  loading.hidden = !value;
  generate.setAttribute("aria-busy", String(value));
}
function createDiagram(diagram) {
  if (!diagram) return null;

  const lines = diagram.lines || [];
  const circles = diagram.circles || [];
  const labels = diagram.labels || [];

  if (!lines.length && !circles.length && !labels.length) {
    return null;
  }

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");

  svg.setAttribute("viewBox", "0 0 360 280");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    diagram.description || "問題の図形"
  );
  svg.style.cssText =
    "display:block;width:100%;max-width:420px;" +
    "height:auto;margin:12px 0;background:white;" +
    "border:1px solid #ddd;border-radius:8px;";

  function addElement(name, attributes) {
    const element = document.createElementNS(ns, name);

    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });

    svg.appendChild(element);
    return element;
  }

  lines.forEach(line => {
    if (![line.x1, line.y1, line.x2, line.y2]
      .every(Number.isFinite)) return;

    addElement("line", {
      x1: line.x1,
      y1: line.y1,
      x2: line.x2,
      y2: line.y2,
      stroke: "#243b53",
      "stroke-width": 2,
      "stroke-dasharray": line.dashed ? "6 4" : "none"
    });
  });

  circles.forEach(circle => {
    if (
      ![circle.cx, circle.cy, circle.r].every(Number.isFinite) ||
      circle.r <= 0
    ) return;

    addElement("circle", {
      cx: circle.cx,
      cy: circle.cy,
      r: circle.r,
      fill: "none",
      stroke: "#243b53",
      "stroke-width": 2
    });
  });

  labels.forEach(label => {
    if (
      ![label.x, label.y].every(Number.isFinite) ||
      typeof label.text !== "string"
    ) return;

    const text = addElement("text", {
      x: label.x,
      y: label.y,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": 15,
      "font-family": "sans-serif",
      fill: "#172b4d",
      stroke: "white",
      "stroke-width": 4,
      "stroke-linejoin": "round",
      "paint-order": "stroke"
    });

    text.textContent = label.text;
  });

  const note = addElement("text", {
    x: 180,
    y: 266,
    "text-anchor": "middle",
    "font-size": 11,
    fill: "#666"
  });
  note.textContent = "図は模式図です。長さ・角度は表示された条件を使ってね。";

  return svg;
}

function normalizeAnswer(value) {
  return String(value)
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function showQuestions(result) {
  if (!result || !Array.isArray(result.questions)) {
    throw new Error("問題の形式を確認できませんでした");
  }

  // 全問の形式を先に確認する
  result.questions.forEach((item) => {
    if (
      !item ||
      !["choice", "text"].includes(item.type) ||
      typeof item.problem !== "string" ||
      typeof item.answer !== "string" ||
      !item.answer.trim() ||
      typeof item.explanation !== "string" ||
      !Array.isArray(item.acceptedAnswers) ||
      !item.acceptedAnswers.every((answer) =>
        typeof answer === "string" && answer.trim()
      )
    ) {
      throw new Error(
        "問題の形式が不完全です。もう一度作成してください"
      );
    }

    if (
      item.type === "choice" &&
      (
        !Array.isArray(item.choices) ||
        item.choices.length !== 3 ||
        !item.choices.every((choice) =>
          typeof choice === "string" && choice.trim()
        ) ||
        new Set(item.choices.map(normalizeAnswer)).size !== 3 ||
        !item.choices.includes(item.answer)
      )
    ) {
      throw new Error(
        "三択の形式を確認できません。もう一度作成してください"
      );
    }
  });

  question.replaceChildren();

  if (!result.questions.length) {
    question.textContent = result.notice ||
      "問題を作成できませんでした。写真を確認してください。";
    return;
  }

  let currentIndex = 0;
  const scores = new Map();

  function makeBlock(text) {
    const element = document.createElement("span");
    element.textContent = text;
    element.style.cssText =
      "display:block;white-space:pre-wrap;margin:12px 0;";
    return element;
  }

  function styleButton(button) {
    button.style.cssText =
      "display:block;width:100%;padding:14px;" +
      "margin-top:16px;font-size:16px;" +
      "box-sizing:border-box;";
  }

  function stars(rate) {
    const count = Math.round(rate / 10);
    return "★".repeat(count) + "☆".repeat(10 - count);
  }

  function moveToQuestion() {
    question.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function showSummary() {
    question.replaceChildren();

    const units = new Map();
    let totalCorrect = 0;

    result.questions.forEach((item, index) => {
      const unit = item.unit || "単元未設定";
      const score = units.get(unit) || {
        correct: 0,
        total: 0
      };

      score.total++;

      if (scores.get(index)) {
        score.correct++;
        totalCorrect++;
      }

      units.set(unit, score);
    });

    const total = result.questions.length;
    const rate = totalCorrect / total * 100;

    const lines = [
      "今回の結果",
      "",
      "全体：" + totalCorrect + "／" + total + "問正解",
      stars(rate),
      "正解率 " + Math.round(rate) + "％"
    ];

    units.forEach((score, unit) => {
      const unitRate = score.correct / score.total * 100;

      lines.push(
        "",
        "単元：" + unit,
        stars(unitRate),
        "正解率 " + Math.round(unitRate) + "％（" +
          score.correct + "／" + score.total + "問正解）"
      );
    });

    const summary = makeBlock(lines.join("\n"));
    summary.style.cssText +=
      "padding:16px;background:#f0f7ff;" +
      "border:2px solid #4285f4;border-radius:8px;" +
      "font-size:18px;overflow-wrap:anywhere;";
    summary.setAttribute("role", "status");

    question.appendChild(summary);
    moveToQuestion();
  }

  function showCurrentQuestion() {
    question.replaceChildren();

    const item = result.questions[currentIndex];

    if (result.notice) {
      question.appendChild(makeBlock(result.notice));
    }

    const card = document.createElement("span");
    card.style.cssText =
      "display:block;margin:20px 0;padding:16px;" +
      "border:1px solid #ccc;border-radius:8px;" +
      "overflow-wrap:anywhere;";

    const title = document.createElement("strong");
    title.textContent =
      "問題 " + (currentIndex + 1) +
      "／" + result.questions.length +
      (item.type === "choice" ? "【三択】" : "【文字入力】");
    title.style.display = "block";

    card.append(title, makeBlock(item.problem));

    const diagram = createDiagram(item.diagram);
    if (diagram) {
      card.appendChild(diagram);
    }

    const answerArea = document.createElement("span");
    answerArea.style.display = "block";

    const controls = [];
    let getAnswer;

    if (item.type === "choice") {
      const radios = [];

      item.choices.forEach((choice) => {
        const label = document.createElement("label");
        label.style.cssText =
          "display:block;padding:14px 8px;margin:8px 0;" +
          "border:1px solid #ddd;border-radius:8px;";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "answer-" + currentIndex;
        radio.value = choice;

        label.append(radio, document.createTextNode(" " + choice));
        answerArea.appendChild(label);

        radios.push(radio);
        controls.push(radio);
      });

      getAnswer = () => {
        const selected = radios.find((radio) => radio.checked);
        return selected ? selected.value : "";
      };
    } else {
      const label = document.createElement("label");
      label.textContent = "あなたの答え（必要な単位も入力してね）";
      label.style.display = "block";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "ここに答えを入力";
      input.style.cssText =
        "display:block;width:100%;margin:8px 0;padding:12px;" +
        "font-size:16px;box-sizing:border-box;";

      label.appendChild(input);
      answerArea.appendChild(label);

      controls.push(input);
      getAnswer = () => input.value.trim();
    }

    const check = document.createElement("button");
    check.type = "button";
    check.textContent = "答え合わせ";
    styleButton(check);

    const feedback = makeBlock("");
    feedback.setAttribute("aria-live", "polite");

    const next = document.createElement("button");
    next.type = "button";
    next.textContent =
      currentIndex === result.questions.length - 1
        ? "結果を見る"
        : "次の問題へ";
    styleButton(next);
    next.hidden = true;
    next.style.display = "none";

    check.addEventListener("click", () => {
      if (scores.has(currentIndex)) return;

      const userAnswer = getAnswer();

      if (!userAnswer) {
        feedback.textContent = item.type === "choice"
          ? "答えを一つ選んでね。"
          : "先に答えを入力してね。";
        return;
      }

      const accepted = [item.answer, ...item.acceptedAnswers];

      const correct = item.type === "choice"
        ? userAnswer === item.answer
        : accepted.some((answer) =>
            normalizeAnswer(answer) === normalizeAnswer(userAnswer)
          );

      scores.set(currentIndex, correct);

      feedback.textContent =
        (correct ? "○ 正解！" : "× 不正解") +
        "\n\nあなたの答え：" + userAnswer +
        "\n\n正解：" + item.answer +
        "\n\n解説：" + item.explanation;

      controls.forEach((control) => {
        control.disabled = true;
      });

      check.disabled = true;
      next.hidden = false;
      next.style.display = "block";
      next.focus();
    });

    next.addEventListener("click", () => {
      if (!scores.has(currentIndex)) return;

      if (currentIndex === result.questions.length - 1) {
        showSummary();
        return;
      }

      currentIndex++;
      showCurrentQuestion();
      moveToQuestion();
    });

    card.append(answerArea, check, feedback, next);
    question.appendChild(card);
  }

  showCurrentQuestion();
  moveToQuestion();
}
generate.addEventListener("click", async () => {
  if (busy) return;
  let files;
  const hobby = hobbyInput.value.trim();
  try { files = getPhotoFiles(); }
  catch (error) { photoMessage.textContent = error.message; return; }
  if (!hobby) {
    question.textContent = "好きなこと・興味のあることを入力してください。";
    hobbyInput.focus();
    return;
  }
  question.replaceChildren();
  setBusy(true);
  const started = Date.now();
  const elapsed = document.getElementById("elapsed");
  elapsed.textContent = "経過時間：0秒";
  const timer = setInterval(() => {
    elapsed.textContent = "経過時間：" + Math.floor((Date.now() - started) / 1000) + "秒";
  }, 1000);
  try {
    const images = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("写真を読み込めませんでした。もう一度写真を選んでください。"));
      reader.onabort = () => reject(new Error("写真の読み込みが中断されました。"));
      reader.readAsDataURL(file);
    })));
    const response = await fetch("/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hobby, images })
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("サーバーの応答を読めませんでした。少し待って、もう一度お試しください。"); }
    if (!response.ok) throw new Error(data.error || "問題を作成できませんでした。");
    let result;
    try { result = JSON.parse(data.question); }
    catch { throw new Error("問題の形式を読めませんでした。もう一度作成してください。"); }
    showQuestions(result);
  } catch (error) {
    question.textContent = "エラー：" + error.message + " 写真と入力内容は残っています。もう一度お試しください。";
  } finally {
    clearInterval(timer);
    setBusy(false);
  }
});
