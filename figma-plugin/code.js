// Figmaプラグイン: 見積もりWF生成 v2
// JSONのsiteMap＋designヒントをもとにページ別ワイヤーフレームを自動生成します

figma.showUI(__html__, { width: 480, height: 580, title: '見積もりWF生成' });

figma.ui.onmessage = async function(msg) {
  if (msg.type === 'cancel') { figma.closePlugin(); return; }

  if (msg.type === 'generate') {
    var data   = msg.data;
    var pages  = data.siteMap || [];
    var design = data.design  || {};

    if (pages.length === 0) {
      figma.notify('ページ情報（siteMap）がありません', { error: true });
      figma.closePlugin();
      return;
    }

    // ── フォント読み込み ──────────────────────────────────────
    try {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    } catch(e) {
      figma.notify('フォントエラー: ' + e.message, { error: true });
      figma.closePlugin();
      return;
    }

    // ── 新規ページ作成 ────────────────────────────────────────
    var newPage = figma.createPage();
    newPage.name = 'WF_' + (data.meta && data.meta.client ? data.meta.client : 'estimate');
    figma.currentPage = newPage;

    // ── レイアウト定数 ─────────────────────────────────────────
    var FW   = 1440;
    var HGAP = 80;
    var VGAP = 120;
    var COLS = 3;

    // セクションごとの高さ定義（TOP用）
    var SEC_HEIGHTS = {
      'hero':         400,
      '院長挨拶':     280,
      '診療科目一覧': 200,
      'スタッフ紹介': 260,
      '施設ギャラリー': 200,
      'アクセス':     280,
      'お知らせ':     220,
      'よくある質問': 280,
      'ビフォーアフター': 240,
      'cta':          140,
      'footer':       200
    };

    // ── カラーパレット ──────────────────────────────────────────
    var C = {
      primary: { r: 0.173, g: 0.373, b: 0.431 },
      white:   { r: 1,     g: 1,     b: 1     },
      light:   { r: 0.937, g: 0.933, b: 0.918 },
      mid:     { r: 0.78,  g: 0.78,  b: 0.78  },
      dark:    { r: 0.10,  g: 0.10,  b: 0.10  },
      accent:  { r: 0.91,  g: 0.643, b: 0.29  },
      green:   { r: 0.18,  g: 0.70,  b: 0.45  },
      blue:    { r: 0.30,  g: 0.58,  b: 0.85  },
      orange:  { r: 0.91,  g: 0.51,  b: 0.18  },
      red:     { r: 0.90,  g: 0.30,  b: 0.30  },
      purple:  { r: 0.55,  g: 0.35,  b: 0.75  },
      gray:    { r: 0.60,  g: 0.60,  b: 0.60  }
    };

    // ── ユーティリティ ─────────────────────────────────────────
    function fill(c, a) {
      return [{ type: 'SOLID', color: c, opacity: (a !== undefined ? a : 1) }];
    }

    function rect(w, h, x, y, color, radius, alpha) {
      var r = figma.createRectangle();
      r.resize(Math.max(w, 1), Math.max(h, 1));
      r.x = x; r.y = y;
      r.fills = fill(color, alpha);
      if (radius) r.cornerRadius = radius;
      return r;
    }

    function txt(str, size, bold, color, x, y) {
      var t = figma.createText();
      t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' };
      t.fontSize = size;
      t.characters = String(str);
      t.fills = fill(color);
      t.x = x; t.y = y;
      return t;
    }

    function typeColor(type) {
      if (type === 'top' || type === 'branch-top') return C.green;
      if (type === 'specialty')                    return C.accent;
      if (type === 'form')                         return C.orange;
      if (type === 'error')                        return C.red;
      if (type === 'blog-list' || type === 'blog-detail') return C.blue;
      if (type === 'post-list' || type === 'post-single') return C.purple;
      if (type === 'privacy')                      return C.gray;
      return C.primary;
    }

    function typeLabel(type) {
      var map = {
        'top':         'TOP',
        'branch-top':  '分院TOP',
        'fixed':       '固定ページ',
        'specialty':   '専門診療',
        'form':        'フォーム',
        'error':       '404',
        'blog-list':   'ブログ一覧',
        'blog-detail': 'ブログ詳細',
        'post-list':   '投稿一覧',
        'post-single': '投稿詳細',
        'privacy':     'プライバシー'
      };
      return map[type] || type;
    }

    // ── 共通パーツ描画 ─────────────────────────────────────────

    // ヘッダーバー（ナビ + 電話番号）
    function drawHeader(f, design) {
      f.appendChild(rect(FW, 80, 0, 0, C.primary));
      f.appendChild(rect(140, 32, 40, 24, C.white, 4, 0.2)); // ロゴ

      var navCount = design.navSize === 'small' ? 4 : design.navSize === 'large' ? 7 : 5;
      var telW = design.headerTel !== false ? 200 : 0;
      var navRight = FW - 50 - telW;
      for (var i = 0; i < navCount; i++)
        f.appendChild(rect(72, 18, navRight - (navCount - i) * 88, 31, C.white, 3, 0.18));

      if (design.headerTel !== false) {
        f.appendChild(rect(188, 38, FW - 228, 21, C.accent, 6, 0.95));
        f.appendChild(rect(100, 14, FW - 218, 33, C.white, 3, 0.4));
      }
    }

    // フッター
    function drawFooter(f, y) {
      f.appendChild(rect(FW, 200, 0, y, C.dark));
      f.appendChild(rect(FW - 80, 1, 40, y + 44, C.white, 0, 0.08));
      for (var i = 0; i < 4; i++)
        f.appendChild(rect(220, 14, 40 + i * 340, y + 60, C.white, 3, 0.12));
      f.appendChild(rect(280, 12, 40, y + 160, C.white, 3, 0.08));
    }

    // ページ種別バッジ＋ページ名ラベル
    function drawPageLabel(f, pageName, pageType) {
      f.appendChild(rect(120, 26, 40, 90, typeColor(pageType), 14));
      f.appendChild(txt(typeLabel(pageType), 11, false, C.white, 52, 97));
      f.appendChild(rect(FW - 80, 56, 40, 126, C.light, 8));
      f.appendChild(txt(pageName, 21, true, C.primary, 60, 139));
    }

    // セクション見出しバー
    function drawSecBar(f, label, y) {
      f.appendChild(rect(FW, 52, 0, y, C.light, 0, 0.55));
      f.appendChild(rect(5, 52, 0, y, C.primary));
      f.appendChild(txt(label, 14, true, C.primary, 22, y + 17));
      return y + 52;
    }

    // ── TOPページのセクション描画 ─────────────────────────────

    function drawHero(f, y, design) {
      f.appendChild(rect(FW, SEC_HEIGHTS['hero'], 0, y, C.light));
      // キャッチコピー
      f.appendChild(rect(400, 26, 60, y + 64,  C.mid, 5, 0.45));
      f.appendChild(rect(600, 48, 60, y + 102, C.mid, 5, 0.35));
      f.appendChild(rect(320, 16, 60, y + 164, C.mid, 4, 0.25));
      // CTAボタン
      var cv = design.mainCV || [];
      var btnX = 60;
      var btnColors = [C.accent, C.primary, C.green];
      var btnLabels = { '電話':'📞 電話', 'Web予約':'🗓 Web予約', 'LINE予約':'💬 LINE', '問い合わせフォーム':'✉️ 問い合わせ' };
      for (var bi = 0; bi < Math.min(cv.length, 3); bi++) {
        f.appendChild(rect(186, 52, btnX, y + 206, btnColors[bi], 8));
        f.appendChild(txt(btnLabels[cv[bi]] || cv[bi], 12, true, C.white, btnX + 24, y + 224));
        btnX += 206;
      }
      if (cv.length === 0) { // CVが未設定
        f.appendChild(rect(186, 52, 60,  y + 206, C.accent, 8));
        f.appendChild(rect(186, 52, 262, y + 206, C.primary, 8, 0.3));
      }
      // 右側ビジュアル
      f.appendChild(rect(520, 340, FW - 580, y + 30, C.mid, 12, 0.22));
      // LINE常設ボタン
      if (design.lineButton) {
        f.appendChild(rect(52, 52, FW - 72, y + 330, C.green, 26));
      }
      return y + SEC_HEIGHTS['hero'];
    }

    function drawNews(f, y) {
      y = drawSecBar(f, 'お知らせ', y);
      var cw = Math.floor((FW - 80 - 40) / 3);
      for (var i = 0; i < 3; i++) {
        var cx = 40 + i * (cw + 20);
        f.appendChild(rect(cw, 12, cx, y + 16, C.primary, 3, 0.15));
        f.appendChild(rect(cw, 56, cx, y + 36, C.light, 6));
        f.appendChild(rect(cw - 20, 12, cx + 10, y + 100, C.mid, 3, 0.35));
      }
      f.appendChild(rect(140, 36, (FW - 140) / 2, y + 132, C.primary, 6, 0.12));
      f.appendChild(txt('一覧を見る →', 11, false, C.primary, (FW - 140) / 2 + 28, y + 146));
      return y + SEC_HEIGHTS['お知らせ'];
    }

    function drawServices(f, y) {
      y = drawSecBar(f, '診療科目一覧', y);
      var cw = Math.floor((FW - 80 - 60) / 4);
      for (var i = 0; i < 4; i++) {
        var cx = 40 + i * (cw + 14);
        f.appendChild(rect(cw, 106, cx, y + 20, C.light, 10));
        f.appendChild(rect(44, 44, cx + (cw - 44) / 2, y + 28, C.primary, 22, 0.12));
        f.appendChild(rect(cw - 28, 13, cx + 14, y + 82, C.mid, 3, 0.4));
        f.appendChild(rect(cw - 40, 10, cx + 20, y + 102, C.mid, 3, 0.25));
      }
      return y + SEC_HEIGHTS['診療科目一覧'];
    }

    function drawDoctor(f, y) {
      y = drawSecBar(f, '院長挨拶', y);
      var pw = 240;
      f.appendChild(rect(pw, 196, 40, y + 24, C.mid, 10, 0.2)); // 写真
      var tx = pw + 80;
      var tw = FW - tx - 40;
      f.appendChild(rect(tw, 18, tx, y + 28,  C.mid, 4, 0.5));  // 名前
      f.appendChild(rect(tw, 13, tx, y + 58,  C.mid, 3, 0.32)); // 役職
      f.appendChild(rect(tw, 84, tx, y + 88,  C.light, 5));      // コメント
      f.appendChild(rect(tw, 60, tx, y + 184, C.light, 5));
      return y + SEC_HEIGHTS['院長挨拶'];
    }

    function drawStaff(f, y) {
      y = drawSecBar(f, 'スタッフ紹介', y);
      var sw = Math.floor((FW - 80 - 40) / 3);
      for (var i = 0; i < 3; i++) {
        var sx = 40 + i * (sw + 20);
        f.appendChild(rect(sw, 140, sx, y + 20, C.mid, 10, 0.18));
        f.appendChild(rect(sw - 20, 15, sx + 10, y + 170, C.mid, 3, 0.45));
        f.appendChild(rect(sw - 30, 11, sx + 15, y + 192, C.mid, 3, 0.28));
      }
      return y + SEC_HEIGHTS['スタッフ紹介'];
    }

    function drawGallery(f, y) {
      y = drawSecBar(f, '施設ギャラリー', y);
      var gw = Math.floor((FW - 80 - 48) / 4);
      for (var i = 0; i < 4; i++)
        f.appendChild(rect(gw, 120, 40 + i * (gw + 16), y + 20, C.mid, 8, 0.22));
      return y + SEC_HEIGHTS['施設ギャラリー'];
    }

    function drawAccess(f, y) {
      y = drawSecBar(f, 'アクセス', y);
      var mw = Math.floor(FW * 0.56);
      f.appendChild(rect(mw, 216, 40, y + 20, C.mid, 8, 0.18)); // 地図
      var tx = mw + 70;
      var tw = FW - tx - 40;
      f.appendChild(rect(tw, 16, tx, y + 24, C.mid, 3, 0.45));
      f.appendChild(rect(tw, 64, tx, y + 50, C.light, 5));
      f.appendChild(rect(tw, 16, tx, y + 128, C.mid, 3, 0.35));
      f.appendChild(rect(tw, 52, tx, y + 154, C.light, 5));
      return y + SEC_HEIGHTS['アクセス'];
    }

    function drawFaq(f, y) {
      y = drawSecBar(f, 'よくある質問', y);
      for (var i = 0; i < 4; i++) {
        var qy = y + 16 + i * 64;
        f.appendChild(rect(FW - 80, 52, 40, qy, C.light, 6));
        f.appendChild(rect(26, 26, 52, qy + 13, C.primary, 13, 0.12));
        f.appendChild(rect(FW - 160, 14, 90, qy + 19, C.mid, 3, 0.38));
      }
      return y + SEC_HEIGHTS['よくある質問'];
    }

    function drawBeforeAfter(f, y) {
      y = drawSecBar(f, 'ビフォーアフター', y);
      var hw = Math.floor((FW - 80 - 20) / 2);
      f.appendChild(rect(hw, 176, 40, y + 20, C.mid, 8, 0.18));
      f.appendChild(txt('Before', 11, false, C.gray, 40 + hw/2 - 18, y + 202));
      f.appendChild(rect(hw, 176, 60 + hw, y + 20, C.light, 8));
      f.appendChild(txt('After',  11, false, C.primary, 60 + hw + hw/2 - 14, y + 202));
      return y + SEC_HEIGHTS['ビフォーアフター'];
    }

    function drawCTABanner(f, y, design) {
      f.appendChild(rect(FW, SEC_HEIGHTS['cta'], 0, y, C.primary, 0, 0.06));
      f.appendChild(rect(360, 20, (FW - 360) / 2, y + 28, C.mid, 4, 0.35));
      var cv = design.mainCV && design.mainCV.length > 0 ? design.mainCV : ['お問い合わせ'];
      var totalBtnW = Math.min(cv.length, 3) * 200 - 20;
      var bx = (FW - totalBtnW) / 2;
      var btnColors = [C.accent, C.primary, C.green];
      for (var i = 0; i < Math.min(cv.length, 3); i++)
        f.appendChild(rect(180, 48, bx + i * 200, y + 68, btnColors[i], 8));
      return y + SEC_HEIGHTS['cta'];
    }

    // ── buildFrame: メイン描画関数 ──────────────────────────────
    function buildFrame(pageName, pageType, design) {
      design = design || {};
      var topSecs = design.topSections || [];

      // フレーム高さを動的計算（TOP系は積み上げ）
      var frameH = 960;
      if (pageType === 'top' || pageType === 'branch-top') {
        frameH = 80 + 96 + SEC_HEIGHTS['hero']; // ヘッダー + ページラベル + ヒーロー
        for (var si = 0; si < topSecs.length; si++)
          frameH += (SEC_HEIGHTS[topSecs[si]] || 200);
        frameH += SEC_HEIGHTS['cta'] + SEC_HEIGHTS['footer'];
        frameH = Math.max(frameH, 960);
      }

      var f = figma.createFrame();
      f.name = pageName;
      f.resize(FW, frameH);
      f.fills = fill(C.white);
      f.clipsContent = false;

      // 共通：ヘッダー
      drawHeader(f, design);
      // 共通：ページバッジ＋名称
      drawPageLabel(f, pageName, pageType);

      var cy = 196; // コンテンツ開始Y

      // ────────────────────────────────────────────────────────
      // TOPページ / 分院TOP
      // ────────────────────────────────────────────────────────
      if (pageType === 'top' || pageType === 'branch-top') {
        cy = drawHero(f, cy, design);
        for (var si = 0; si < topSecs.length; si++) {
          var sec = topSecs[si];
          if      (sec === 'お知らせ')        cy = drawNews(f, cy);
          else if (sec === '診療科目一覧')     cy = drawServices(f, cy);
          else if (sec === '院長挨拶')         cy = drawDoctor(f, cy);
          else if (sec === 'スタッフ紹介')     cy = drawStaff(f, cy);
          else if (sec === '施設ギャラリー')   cy = drawGallery(f, cy);
          else if (sec === 'アクセス')         cy = drawAccess(f, cy);
          else if (sec === 'よくある質問')     cy = drawFaq(f, cy);
          else if (sec === 'ビフォーアフター') cy = drawBeforeAfter(f, cy);
        }
        cy = drawCTABanner(f, cy, design);
        drawFooter(f, cy);

      // ────────────────────────────────────────────────────────
      // 専門診療ページ
      // ────────────────────────────────────────────────────────
      } else if (pageType === 'specialty') {
        // ページヘッダービジュアル
        f.appendChild(rect(FW, 160, 0, cy, C.light));
        f.appendChild(rect(480, 24, 60, cy + 48, C.mid, 5, 0.45));
        f.appendChild(rect(320, 16, 60, cy + 82, C.mid, 4, 0.3));
        cy += 176;
        // 本文 + サイドバー
        var aw = Math.floor(FW * 0.64) - 60;
        var sw = Math.floor(FW * 0.28);
        var sx = aw + 100;
        f.appendChild(rect(aw, 120, 60, cy,       C.light, 6));
        f.appendChild(rect(aw,  80, 60, cy + 136, C.light, 6));
        f.appendChild(rect(aw,  80, 60, cy + 232, C.light, 6));
        f.appendChild(rect(sw, 180, sx, cy,       C.light, 8));
        // CTA（サイドバー内）
        f.appendChild(rect(sw,  48, sx, cy + 196, C.accent, 8, 0.85));
        f.appendChild(rect(sw,  48, sx, cy + 256, C.primary, 8, 0.15));
        drawFooter(f, frameH - 200);

      // ────────────────────────────────────────────────────────
      // 固定ページ（名前でレイアウト分岐）
      // ────────────────────────────────────────────────────────
      } else if (pageType === 'fixed') {
        var nm = pageName;
        var aw2 = Math.floor(FW * 0.64) - 60;
        var sw2 = Math.floor(FW * 0.28);
        var sx2 = aw2 + 100;

        // タイトルバー（共通）
        f.appendChild(rect(FW, 80, 0, cy, C.light));
        f.appendChild(rect(280, 20, 60, cy + 30, C.mid, 4));
        cy += 96;

        if (nm.indexOf('アクセス') >= 0) {
          // 地図大 + 交通情報
          f.appendChild(rect(FW - 80, 280, 40, cy, C.mid, 8, 0.18)); // 地図
          cy += 296;
          var tw2 = Math.floor((FW - 80 - 40) / 2);
          f.appendChild(rect(tw2, 130, 40, cy, C.light, 8));
          f.appendChild(rect(tw2, 130, 60 + tw2, cy, C.light, 8));

        } else if (nm.indexOf('よくある質問') >= 0 || nm.indexOf('FAQ') >= 0) {
          // FAQアコーディオン
          for (var qi = 0; qi < 6; qi++) {
            var qy2 = cy + qi * 68;
            f.appendChild(rect(FW - 80, 56, 40, qy2, C.light, 6));
            f.appendChild(rect(26, 26, 52, qy2 + 15, C.primary, 13, 0.12));
            f.appendChild(rect(FW - 160, 14, 90, qy2 + 21, C.mid, 3, 0.38));
          }

        } else if (nm.indexOf('スタッフ') >= 0 || nm.indexOf('医師') >= 0 || nm.indexOf('獣医') >= 0) {
          // スタッフカードグリッド
          var scw = Math.floor((FW - 80 - 40) / 3);
          for (var sfi = 0; sfi < 6; sfi++) {
            var sfx = 40 + (sfi % 3) * (scw + 20);
            var sfy = cy + Math.floor(sfi / 3) * 240;
            f.appendChild(rect(scw, 150, sfx, sfy, C.mid, 10, 0.18));
            f.appendChild(rect(scw - 20, 15, sfx + 10, sfy + 162, C.mid, 3, 0.45));
            f.appendChild(rect(scw - 30, 11, sfx + 15, sfy + 184, C.mid, 3, 0.28));
          }

        } else if (nm.indexOf('診療') >= 0 || nm.indexOf('治療') >= 0 || nm.indexOf('科目') >= 0) {
          // 診療アイコングリッド + 本文
          var dw = Math.floor((FW - 80 - 60) / 4);
          for (var di = 0; di < 4; di++) {
            var dx = 40 + di * (dw + 14);
            f.appendChild(rect(dw, 108, dx, cy, C.light, 10));
            f.appendChild(rect(44, 44, dx + (dw - 44) / 2, cy + 12, C.primary, 22, 0.1));
            f.appendChild(rect(dw - 28, 13, dx + 14, cy + 68, C.mid, 3, 0.38));
          }
          cy += 124;
          f.appendChild(rect(aw2, 120, 60, cy, C.light, 6));
          f.appendChild(rect(aw2,  88, 60, cy + 136, C.light, 6));
          f.appendChild(rect(sw2, 110, sx2, cy, C.light, 8));
          f.appendChild(rect(sw2,  88, sx2, cy + 126, C.light, 8));

        } else if (nm.indexOf('院長') >= 0 || nm.indexOf('紹介') >= 0 || nm.indexOf('施設') >= 0) {
          // 写真 + テキスト
          var pw3 = 280;
          f.appendChild(rect(pw3, 320, 40, cy, C.mid, 10, 0.18));
          var tx3 = pw3 + 80;
          var tw3 = FW - tx3 - 40;
          f.appendChild(rect(tw3, 20, tx3, cy + 8,  C.mid, 4, 0.5));
          f.appendChild(rect(tw3, 13, tx3, cy + 40, C.mid, 3, 0.3));
          f.appendChild(rect(tw3, 96, tx3, cy + 70, C.light, 5));
          f.appendChild(rect(tw3, 72, tx3, cy + 182, C.light, 5));
          f.appendChild(rect(tw3, 52, tx3, cy + 270, C.light, 5));

        } else {
          // 汎用2カラム
          f.appendChild(rect(aw2, 130, 60, cy,       C.light, 6));
          f.appendChild(rect(aw2,  96, 60, cy + 146, C.light, 6));
          f.appendChild(rect(aw2, 116, 60, cy + 258, C.light, 6));
          f.appendChild(rect(sw2, 110, sx2, cy,       C.light, 8));
          f.appendChild(rect(sw2,  88, sx2, cy + 126, C.light, 8));
          f.appendChild(rect(sw2,  88, sx2, cy + 230, C.light, 8));
        }
        drawFooter(f, frameH - 200);

      // ────────────────────────────────────────────────────────
      // ブログ/投稿一覧
      // ────────────────────────────────────────────────────────
      } else if (pageType === 'blog-list' || pageType === 'post-list') {
        f.appendChild(rect(FW, 80, 0, cy, C.light));
        f.appendChild(rect(200, 20, 60, cy + 30, C.mid, 4));
        cy += 96;
        var lcw = Math.floor((FW - 80 - 40) / 3);
        for (var row = 0; row < 2; row++)
          for (var col = 0; col < 3; col++)
            f.appendChild(rect(lcw - 16, 170, 40 + col * (lcw + 8), cy + row * 194, C.light, 8));
        for (var pi = 0; pi < 5; pi++)
          f.appendChild(rect(36, 36, FW / 2 - 110 + pi * 55, cy + 420, C.light, 4));
        drawFooter(f, frameH - 200);

      // ────────────────────────────────────────────────────────
      // ブログ/投稿詳細
      // ────────────────────────────────────────────────────────
      } else if (pageType === 'blog-detail' || pageType === 'post-single') {
        var daw = Math.floor(FW * 0.64) - 60;
        var dsw = Math.floor(FW * 0.28);
        var dsx = daw + 100;
        f.appendChild(rect(daw, 28, 60, cy,      C.mid, 4, 0.45));
        f.appendChild(rect(daw, 48, 60, cy + 40, C.mid, 4, 0.35));
        f.appendChild(rect(daw, 180, 60, cy + 106, C.light, 6)); // アイキャッチ
        for (var bpi = 0; bpi < 3; bpi++)
          f.appendChild(rect(daw, 84, 60, cy + 306 + bpi * 104, C.light, 6));
        f.appendChild(rect(dsw, 180, dsx, cy,       C.light, 8));
        f.appendChild(rect(dsw, 140, dsx, cy + 200, C.light, 8));
        f.appendChild(rect(dsw, 120, dsx, cy + 360, C.light, 8));
        drawFooter(f, frameH - 200);

      // ────────────────────────────────────────────────────────
      // フォーム
      // ────────────────────────────────────────────────────────
      } else if (pageType === 'form') {
        var fw2 = FW - 120;
        var fields = ['お名前', '電話番号', 'メールアドレス', 'お問い合わせ内容', ''];
        for (var fi = 0; fi < 5; fi++) {
          f.appendChild(rect(180, 15, 60, cy + fi * 112,      C.mid, 3, 0.42));
          f.appendChild(rect(fw2, fi === 3 ? 120 : 50, 60, cy + fi * 112 + 24, C.light, 6));
        }
        f.appendChild(rect(240, 56, (FW - 240) / 2, cy + 590, C.primary, 8));
        drawFooter(f, frameH - 200);

      // ────────────────────────────────────────────────────────
      // 404
      // ────────────────────────────────────────────────────────
      } else if (pageType === 'error') {
        f.appendChild(rect(220, 96,  (FW - 220) / 2, cy + 80,  C.light, 12));
        f.appendChild(rect(380, 24,  (FW - 380) / 2, cy + 204, C.mid, 4, 0.48));
        f.appendChild(rect(280, 18,  (FW - 280) / 2, cy + 244, C.mid, 4, 0.32));
        f.appendChild(rect(180, 48,  (FW - 180) / 2, cy + 296, C.primary, 8));
        drawFooter(f, frameH - 200);

      // ────────────────────────────────────────────────────────
      // プライバシー / その他
      // ────────────────────────────────────────────────────────
      } else {
        f.appendChild(rect(FW, 80, 0, cy, C.light));
        f.appendChild(rect(280, 20, 60, cy + 30, C.mid, 4));
        cy += 96;
        for (var pri = 0; pri < 4; pri++)
          f.appendChild(rect(FW - 80, 68, 40, cy + pri * 96, C.light, 6));
        drawFooter(f, frameH - 200);
      }

      return f;
    }

    // ── メインループ（フレームを格子状に配置）────────────────
    var colIdx    = 0;
    var rowY      = 0;
    var rowMaxH   = 0;
    var curSection = '';
    var created   = [];

    for (var i = 0; i < pages.length; i++) {
      var page = pages[i];

      // セクション変わり目のラベル
      if (page.section !== curSection) {
        if (curSection !== '') {
          rowY += rowMaxH + VGAP;
          colIdx = 0; rowMaxH = 0;
          rowY += 60;
        }
        var secLbl = txt(
          (page.section === '病院サイト' ? '🏥 ' : '👔 ') + page.section,
          28, true, C.primary, 0, rowY
        );
        figma.currentPage.appendChild(secLbl);
        created.push(secLbl);
        rowY += 50;
        curSection = page.section;
      }

      // フレーム生成・配置
      var frame = buildFrame(page.name, page.type, design);
      frame.x = colIdx * (FW + HGAP);
      frame.y = rowY;
      figma.currentPage.appendChild(frame);
      created.push(frame);

      if (frame.height > rowMaxH) rowMaxH = frame.height;
      colIdx++;
      if (colIdx >= COLS) {
        colIdx = 0;
        rowY += rowMaxH + VGAP;
        rowMaxH = 0;
      }
    }

    figma.viewport.scrollAndZoomIntoView(created);
    figma.notify('✅ ' + pages.length + 'ページのワイヤーフレームを生成しました！');
    figma.closePlugin();
  }
};
