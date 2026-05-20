/**
 * Corrige strings mojibake (UTF-8 lido como Latin-1/CP1252) em arquivos do frontend.
 */
const fs = require("fs");
const path = require("path");

const REPLACEMENTS = [
  ["participa├º├úo", "participação"],
  ["Participa├º├úo", "Participação"],
  ["sele├º├úo", "seleção"],
  ["Sele├º├úo", "Seleção"],
  ["SELE├ç├âO", "SELEÇÃO"],
  ["confirma├º├úo", "confirmação"],
  ["compensa├º├úo", "compensação"],
  ["utiliza├º├úo", "utilização"],
  ["orienta├º├úo", "orientação"],
  ["renova├º├úo", "renovação"],
  ["convers├úo", "conversão"],
  ["promo├º├Áes", "promoções"],
  ["promo├º├úo", "promoção"],
  ["Informa├º├Áes", "Informações"],
  ["Observa├º├úo", "Observação"],
  ["exce├º├úo", "exceção"],
  ["indispon├¡veis", "indisponíveis"],
  ["indispon├¡vel", "indisponível"],
  ["intransfer├¡vel", "intransferível"],
  ["n├║meros", "números"],
  ["n├║mero", "número"],
  ["N├ÜMEROS", "NÚMEROS"],
  ["N├║mero", "Número"],
  ["N├║meros", "Números"],
  ["voc├¬", "você"],
  ["Voc├¬", "Você"],
  ["Cart├úo", "Cartão"],
  ["cart├úo", "cartão"],
  ["Cart├Áes", "Cartões"],
  ["cart├Áes", "cartões"],
  ["├║nico", "único"],
  ["├║ltimo", "último"],
  ["├║ltima", "última"],
  ["v├ílido", "válido"],
  ["v├ílida", "válida"],
  ["V├ílido", "Válido"],
  ["DISPON├ìVEL", "DISPONÍVEL"],
  ["INDISPON├ìVEL", "INDISPONÍVEL"],
  ["Transpar├¬ncia", "Transparência"],
  ["CONTE├ÜDO", "CONTEÚDO"],
  ["Conte├║do", "Conteúdo"],
  ["conte├║do", "conteúdo"],
  ["cr├®dito", "crédito"],
  ["Cr├®dito", "Crédito"],
  ["cr├®ditos", "créditos"],
  ["C├│digo", "Código"],
  ["Pre├ºo", "Preço"],
  ["pre├ºo", "preço"],
  ["din├ómico", "dinâmico"],
  ["p├║blica", "pública"],
  ["v├¬m", "vêm"],
  ["ap├│s", "após"],
  ["Ap├│s", "Após"],
  ["at├®", "até"],
  ["At├®", "Até"],
  ["ser├í", "será"],
  ["s├│", "só"],
  ["N├âO", "NÃO"],
  ["N├úo", "Não"],
  ["n├úo", "não"],
  ["j├í", "já"],
  ["usu├írio", "usuário"],
  ["T├¡tulo", "Título"],
  ["├¡cone", "ícone"],
  ["refer├¬ncia", "referência"],
  ["BENEF├ìCIOS", "BENEFÍCIOS"],
  ["poss├¡vel", "possível"],
  ["pr├│ximo", "próximo"],
  ["pr├¬mio", "prêmio"],
  ["m├íximo", "máximo"],
  ["m├¡nimo", "mínimo"],
  ["Condi├º├úo", "Condição"],
  ["renov├ível", "renovável"],
  ["Econ├┤mica", "Econômica"],
  ["ac├║mulo", "acúmulo"],
  ["fa├ºa", "faça"],
  ["L├í", "Lá"],
  ["poder├í", "poderá"],
  ["est├úo", "estão"],
  ["├ürea", "Área"],
  ["├ë", "É"],
  ["m├íximo", "máximo"],
  ["m├íxima", "máxima"],
  ["ÔÇö", "—"],
  ["ÔÇó", "•"],
  ["ÔåÆ", "→"],
  ["­ƒÄë", "🎉"],
  ["├º├úo", "ção"],
  ["├º├ú", "çã"],
  ["├º├Á", "çõ"],
  ["├º", "ç"],
  ["├ú", "ã"],
  ["├¬", "ê"],
  ["├®", "é"],
  ["├í", "á"],
  ["├║", "ú"],
  ["├ì", "Í"],
  ["├Â", "ô"],
  ["├¡", "í"],
  ["├ü", "Á"],
  ["├ç", "Ç"],
  ["├á", "à"],
  ["├Ç", "À"],
];

const TARGETS = [
  "src/NewStorePage.jsx",
  "src/PixModal.jsx",
  "src/AccountPage.jsx",
  "src/LoginPage.jsx",
  "src/RegisterPage.jsx",
  "src/components/PublicTopbar.jsx",
  "src/components/GiftCardSimulator.jsx",
  "public/index.html",
];

const root = path.join(__dirname, "..");

function fixFile(relPath) {
  const filePath = path.join(root, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn("skip (missing):", relPath);
    return 0;
  }
  let text = fs.readFileSync(filePath, "utf8");
  const before = text;
  for (const [from, to] of REPLACEMENTS) {
    text = text.split(from).join(to);
  }
  if (text !== before) {
    fs.writeFileSync(filePath, text, "utf8");
    const hits = (before.match(/├|ÔÇ|­ƒ/g) || []).length;
    console.log("fixed:", relPath, `(${hits} mojibake chars before)`);
    return 1;
  }
  console.log("unchanged:", relPath);
  return 0;
}

let fixed = 0;
for (const t of TARGETS) fixed += fixFile(t);

// Scan all src + public for remaining mojibake
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "build") continue;
      walk(p, acc);
    } else if (/\.(jsx?|tsx?|html|css|json)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

const MOJI = /├|ÔÇ|­ƒ/;
let remaining = [];
for (const f of [...walk(path.join(root, "src")), ...walk(path.join(root, "public"))]) {
  const t = fs.readFileSync(f, "utf8");
  if (MOJI.test(t)) {
    const rel = path.relative(root, f);
    const count = (t.match(MOJI) || []).length;
    remaining.push(`${rel} (${count})`);
  }
}

console.log("\nFixed files:", fixed);
if (remaining.length) {
  console.log("\nRemaining mojibake:");
  remaining.forEach((r) => console.log(" ", r));
  process.exit(1);
} else {
  console.log("\nNo remaining mojibake in src/public.");
}
