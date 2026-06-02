const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  ImageRun, LevelFormat } = require('docx');

const CY = "1093A8", DARK = "10131C", GREY = "555F6B";
const border = { style: BorderStyle.SINGLE, size: 1, color: "C9D4DD" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, w, { head=false, bold=false, mono=false }={}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: { fill: head ? "E6F7FA" : "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: head||bold,
      size: 18, color: head ? CY : "222831", font: mono ? "Consolas" : "Arial" })] })]
  });
}
function row(cells){ return new TableRow({ children: cells }); }

const shot = fs.readFileSync('screenshots/capture_1.png');

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:24, bold:true, font:"Arial", color: CY },
        paragraph:{ spacing:{ before:150, after:70 }, outlineLevel:0 } },
    ]
  },
  numbering: { config: [
    { reference:"steps", levels:[{ level:0, format:LevelFormat.DECIMAL, text:"%1.",
      alignment:AlignmentType.LEFT, style:{ paragraph:{ indent:{ left:460, hanging:300 } } } }] },
  ]},
  sections: [{
    properties: { page: { size:{ width:12240, height:15840 },
      margin:{ top:1000, right:1080, bottom:800, left:1080 } } },
    children: [
      new Paragraph({ spacing:{ after:20 }, children:[
        new TextRun({ text:"인터랙티브 3D 콘텐츠 — 실행 방법 설명서", bold:true, size:30, color:DARK })]}),
      new Paragraph({ border:{ bottom:{ style:BorderStyle.SINGLE, size:6, color:CY, space:2 } },
        spacing:{ after:130 }, children:[
        new TextRun({ text:"작품명: NOVA · Interactive 3D Control Room   |   개발환경: Three.js (r160) + Vite + npm",
          size:17, color:GREY })]}),

      new Paragraph({ heading:HeadingLevel.HEADING_1, children:[new TextRun("1. 작품 개요")]}),
      new Paragraph({ spacing:{ after:110 }, children:[ new TextRun({
        text:"네온/레트로퓨처 우주 정거장 공간에서 직접 제작한 로봇 모델 'NOVA'를 마우스와 키보드로 조작하는 인터랙티브 3D 콘텐츠. GLTF(GLB) 모델 로드, 다중 조명과 그림자, 환경맵 반사, 시간 기반 애니메이션, 레이캐스트 클릭 반응을 구현했다.",
        size:18 })]}),

      new Paragraph({ heading:HeadingLevel.HEADING_1, children:[new TextRun("2. 실행 방법 (npm)")]}),
      new Paragraph({ spacing:{ after:30 }, children:[new TextRun({
        text:"Node.js 가 설치된 환경에서 프로젝트 폴더(graphic)를 열고 아래 순서로 실행한다.", size:18, italics:true, color:GREY })]}),
      new Paragraph({ numbering:{ reference:"steps", level:0 }, children:[
        new TextRun({ text:"의존성 설치 — ", size:19 }),
        new TextRun({ text:"npm install", size:19, font:"Consolas", bold:true, color:DARK }),
        new TextRun({ text:"  (package.json의 three, vite를 내려받음)", size:17, color:GREY })]}),
      new Paragraph({ numbering:{ reference:"steps", level:0 }, children:[
        new TextRun({ text:"개발 서버 실행 — ", size:19 }),
        new TextRun({ text:"npm run dev", size:19, font:"Consolas", bold:true, color:DARK }),
        new TextRun({ text:"  (브라우저가 자동으로 열림 → http://localhost:5173)", size:17, color:GREY })]}),
      new Paragraph({ numbering:{ reference:"steps", level:0 }, spacing:{ after:110 }, children:[
        new TextRun({ text:"(선택) 배포용 빌드 — ", size:19 }),
        new TextRun({ text:"npm run build", size:19, font:"Consolas", bold:true, color:DARK }),
        new TextRun({ text:" 후 ", size:19 }),
        new TextRun({ text:"npm run preview", size:19, font:"Consolas", bold:true, color:DARK })]}),

      new Paragraph({ heading:HeadingLevel.HEADING_1, children:[new TextRun("3. 필수 구현 사항")]}),
      new Table({ width:{ size:10080, type:WidthType.DXA }, columnWidths:[2500, 7580], rows:[
        row([ cell("요구사항", 2500, {head:true}), cell("구현 내용", 7580, {head:true}) ]),
        row([ cell("① 3D 모델(GLB)", 2500, {bold:true}), cell("public/models/nova.glb 를 GLTFLoader로 로드 (직접 제작)", 7580) ]),
        row([ cell("② 조명", 2500, {bold:true}), cell("Ambient + Directional(그림자) + PointLight×2 (시안·핑크 림라이트)", 7580) ]),
        row([ cell("③ 애니메이션", 2500, {bold:true}), cell("둥실 떠다님·발광 맥동·점프(중력)·댄스 회전 — requestAnimationFrame 루프", 7580) ]),
        row([ cell("④ 인터랙션", 2500, {bold:true}), cell("드래그 시점회전/휠 줌, 클릭 시 레이캐스트 반응, WASD 이동·Space 점프·R 리셋", 7580) ]),
      ]}),

      new Paragraph({ heading:HeadingLevel.HEADING_1, spacing:{ before:150 }, children:[new TextRun("4. 조작 방법")]}),
      new Table({ width:{ size:10080, type:WidthType.DXA }, columnWidths:[3100, 6980], rows:[
        row([ cell("입력", 3100, {head:true}), cell("동작", 6980, {head:true}) ]),
        row([ cell("마우스 드래그 / 휠", 3100), cell("카메라 시점 회전 / 줌 인·아웃", 6980) ]),
        row([ cell("NOVA 클릭", 3100), cell("점프 + 발광 플래시 + 말풍선 반응", 6980) ]),
        row([ cell("W A S D / 방향키", 3100), cell("로봇 이동 (진행 방향으로 회전)", 6980) ]),
        row([ cell("Space / R", 3100), cell("점프 / 위치·색상 리셋", 6980) ]),
        row([ cell("하단 도크 버튼", 3100), cell("댄스·점프·리셋·색상 변경·화면 캡처(📸)", 6980) ]),
      ]}),

      new Paragraph({ heading:HeadingLevel.HEADING_1, spacing:{ before:150 }, children:[new TextRun("5. 결과 화면")]}),
      new Paragraph({ alignment:AlignmentType.CENTER, children:[ new ImageRun({
        type:"png", data:shot, transformation:{ width:410, height:256 } })]}),
    ]
  }]
});

Packer.toBuffer(doc).then(b=>{ fs.writeFileSync("실행방법_설명서.docx", b); console.log("OK docx"); });
