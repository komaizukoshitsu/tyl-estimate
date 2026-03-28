// Figmaプラグイン: 見積もりWF生成
// 見積もりフォームから出力したJSONをもとに、各ページのワイヤーフレームを自動生成します

figma.showUI(__html__, { width: 480, height: 580, title: '見積もりWF生成' });

figma.ui.onmessage = async function (msg) {
  if (msg.type === 'cancel') {
    figma.closePlugin();
    return;
  }

  if (msg.type === 'generate') {
    var data = msg.data;
    var pages = data.siteMap || [];

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
    } catch (e) {
      figma.notify('フォントエラー: ' + e.message, { error: true });
      figma.closePlugin();
      return;
    }

    // ── 新規ページ作成 ────────────────────────────────────────
    var newPage = figma.createPage();
    newPage.name = 'WF_' + (data.meta && data.meta.client ? data.meta.client : 'estimate');
    figma.currentPage = newPage;

    // ── レイアウト定数 ─────────────────────────────────────────
    var FW = 1440;  // フレーム幅
    var FH = 960;   // フレーム高さ
    var HGAP = 80;  // 横間隔
    var VGAP = 120; // 縦間隔
    var COLS = 3;   // 1行あたりのフレーム数

    // ── カラーパレット（0〜1） ──────────────────────────────────
    var C = {
      primary: { r: 0.173, g: 0.373, b: 0.431 },
      white:   { r: 1,     g: 1,     b: 1     },
      light:   { r: 0.937, g: 0.933, b: 0.918 },
      mid:     { r: 0.78,  g: 0.78,  b: 0.78  },
      dark:    { r: 0.13,  g: 0.13,  b: 0.13  },
      accent:  { r: 0.91,  g: 0.643, b: 0.29  },
      green:   { r: 0.18,  g: 0.70,  b: 0.45  },
      blue:    { r: 0.30,  g: 0.58,  b: 0.85  },
      orange:  { r: 0.91,  g: 0.51,  b: 0.18  },
      red:     { r: 0.90,  g: 0.30,  b: 0.30  },
      purple:  { r: 0.55,  g: 0.35,  b: 0.75  },
      gray:    { r: 0.60,  g: 0.60,  b: 0.60  },
    };

    // ── ユーティリティ ─────────────────────────────────────────
    function fill(c, a) {
      return [{ type: 'SOLID', color: c, opacity: (a !== undefined ? a : 1) }];
    }

    function rect(w, h, x, y, color, radius, alpha) {
      var r = figma.createRectangle();
      r.resize(w, h);
      r.x = x; r.y = y;
      r.fills = fill(color, alpha);
      if (radius) r.cornerRadius = radius;
      return r;
    }

    function txt(str, size, isBold, color, x, y) {
      var t = figma.createText();
      t.fontName = { family: 'Inter', style: isBold ? 'Bold' : 'Regular' };
      t.fontSize = size;
      t.characters = str;
      t.fills = fill(color);
      t.x = x; t.y = y;
      return t;
    }

    // ページタイプ別バッジカラー
    function typeColor(type) {
      if (type === 'top')                                   return C.green;
      if (type === 'form')                                  return C.orange;
      if (type === 'error')                                 return C.red;
      if (type === 'blog-list' || type === 'blog-detail')   return C.blue;
      if (type === 'post-single' || type === 'post-list')   return C.purple;
      if (type === 'privacy')                               return C.gray;
      return C.primary;
    }

    // ページタイプ日本語ラベル
    function typeLabel(type) {
      var map = {
        'top': 'TOP', 'fixed': '固定ページ', 'form': 'フォーム', 'error': '404',
        'blog-list': 'ブログ一覧', 'blog-detail': 'ブログ詳細',
        'post-list': '投稿一覧', 'post-single': '投稿詳細', 'privacy': 'プライバシー'
      };
      return map[type] || type;
    }

    // ── ワイヤーフレーム生成（ページタイプ別） ───────────────────
    function buildFrame(pageName, pageType) {
      var f = figma.createFrame();
      f.name = pageName;
      f.resize(FW, FH);
      f.fills = fill(C.white);
      f.clipsContent = true;

      var cy = 214; // コンテンツエリア開始Y

      // ── ナビゲーションヘッダー ──
      f.appendChild(rect(FW, 80, 0, 0, C.primary));
      f.appendChild(rect(140, 32, 40, 24, C.white, 4, 0.2));    // ロゴ
      for (var i = 0; i < 4; i++)
        f.appendChild(rect(80, 20, FW - 460 + i * 110, 30, C.white, 3, 0.18)); // ナビ

      // ── タイプバッジ ──
      f.appendChild(rect(120, 26, 40, 94, typeColor(pageType), 14));
      f.appendChild(txt(typeLabel(pageType), 12, false, C.white, 52, 99));

      // ── ページ名ラベル ──
      f.appendChild(rect(FW - 80, 64, 40, 130, C.light, 10));
      f.appendChild(txt(pageName, 24, true, C.primary, 60, 145));

      // ── コンテンツ（タイプ別） ──────────────────────────────

      if (pageType === 'top') {
        // ヒーロー
        f.appendChild(rect(FW, 360, 0, cy, C.light));
        f.appendChild(rect(360, 32, 60, cy + 60,  C.mid, 6, 0.6));
        f.appendChild(rect(560, 52, 60, cy + 112, C.mid, 6, 0.5));
        f.appendChild(rect(150, 44, 60, cy + 195, C.accent, 8));
        f.appendChild(rect(140, 44, 225, cy + 195, C.primary, 8, 0.3));
        // 3カラム特徴エリア
        var gy = cy + 390;
        f.appendChild(rect(FW - 80, 28, 40, gy, C.mid, 4, 0.35));
        var cw = Math.floor((FW - 80 - 40) / 3);
        for (var i = 0; i < 3; i++)
          f.appendChild(rect(cw - 16, 155, 40 + i * cw, gy + 50, C.light, 8));
        // フッター
        f.appendChild(rect(FW, 80, 0, FH - 80, C.dark));

      } else if (pageType === 'fixed') {
        // タイトルバー
        f.appendChild(rect(FW, 90, 0, cy, C.light));
        f.appendChild(rect(280, 26, 60, cy + 32, C.mid, 4));
        // 2カラム（メイン＋サイドバー）
        var aw = Math.floor(FW * 0.64) - 60;
        var sw = Math.floor(FW * 0.28);
        var sx = aw + 100;
        var ly = cy + 115;
        f.appendChild(rect(aw, 145, 60, ly,       C.light, 6));
        f.appendChild(rect(aw, 100, 60, ly + 165, C.light, 6));
        f.appendChild(rect(aw, 125, 60, ly + 285, C.light, 6));
        f.appendChild(rect(sw, 110, sx, cy,       C.light, 8));
        f.appendChild(rect(sw, 90,  sx, cy + 130, C.light, 8));
        f.appendChild(rect(sw, 90,  sx, cy + 240, C.light, 8));
        // フッター
        f.appendChild(rect(FW, 80, 0, FH - 80, C.dark));

      } else if (pageType === 'blog-list' || pageType === 'post-list') {
        // タイトルバー
        f.appendChild(rect(FW, 80, 0, cy, C.light));
        f.appendChild(rect(200, 24, 60, cy + 28, C.mid, 4));
        // 記事カード 3×2
        var cw2 = Math.floor((FW - 80 - 40) / 3);
        for (var row = 0; row < 2; row++)
          for (var col = 0; col < 3; col++)
            f.appendChild(rect(cw2 - 16, 170, 40 + col * cw2, cy + 100 + row * 195, C.light, 8));
        // ページネーション
        for (var i = 0; i < 5; i++)
          f.appendChild(rect(36, 36, FW / 2 - 100 + i * 50, cy + 530, C.light, 4));
        // フッター
        f.appendChild(rect(FW, 80, 0, FH - 80, C.dark));

      } else if (pageType === 'blog-detail' || pageType === 'post-single') {
        var aw2 = Math.floor(FW * 0.64) - 60;
        var sw2 = Math.floor(FW * 0.28);
        var sx2 = aw2 + 100;
        // 記事タイトル
        f.appendChild(rect(aw2, 32, 60, cy,      C.mid, 4, 0.55));
        f.appendChild(rect(aw2, 48, 60, cy + 42, C.mid, 4, 0.40));
        // 本文ブロック
        for (var i = 0; i < 4; i++)
          f.appendChild(rect(aw2, 88, 60, cy + 112 + i * 108, C.light, 6));
        // サイドバー
        f.appendChild(rect(sw2, 190, sx2, cy,       C.light, 8));
        f.appendChild(rect(sw2, 150, sx2, cy + 210, C.light, 8));
        f.appendChild(rect(sw2, 120, sx2, cy + 380, C.light, 8));
        // フッター
        f.appendChild(rect(FW, 80, 0, FH - 80, C.dark));

      } else if (pageType === 'form') {
        var fy = cy;
        var fw2 = FW - 120;
        for (var i = 0; i < 5; i++) {
          f.appendChild(rect(180, 18, 60, fy + i * 108,       C.mid, 3, 0.5));
          f.appendChild(rect(fw2, i === 3 ? 112 : 50, 60, fy + i * 108 + 26, C.light, 6));
        }
        // 送信ボタン
        f.appendChild(rect(220, 52, (FW - 220) / 2, fy + 580, C.primary, 8));
        // フッター
        f.appendChild(rect(FW, 80, 0, FH - 80, C.dark));

      } else if (pageType === 'error') {
        // 404 中央配置
        f.appendChild(rect(200, 90,  (FW - 200) / 2, cy + 80,  C.light, 12));
        f.appendChild(rect(380, 28,  (FW - 380) / 2, cy + 200, C.mid, 4, 0.50));
        f.appendChild(rect(260, 24,  (FW - 260) / 2, cy + 244, C.mid, 4, 0.35));
        f.appendChild(rect(160, 44,  (FW - 160) / 2, cy + 304, C.primary, 8));
        // フッター
        f.appendChild(rect(FW, 80, 0, FH - 80, C.dark));

      } else {
        // privacy, その他
        f.appendChild(rect(FW, 80, 0, cy, C.light));
        f.appendChild(rect(280, 24, 60, cy + 28, C.mid, 4));
        for (var i = 0; i < 4; i++)
          f.appendChild(rect(FW - 80, 72, 40, cy + 110 + i * 102, C.light, 6));
        // フッター
        f.appendChild(rect(FW, 80, 0, FH - 80, C.dark));
      }

      return f;
    }

    // ── メインループ ──────────────────────────────────────────
    var colIdx = 0;
    var rowY = 0;
    var currentSection = '';
    var created = [];

    for (var i = 0; i < pages.length; i++) {
      var page = pages[i];

      // セクション変わり目にラベル追加
      if (page.section !== currentSection) {
        if (currentSection !== '') {
          if (colIdx > 0) { rowY += FH + VGAP; colIdx = 0; }
          rowY += 80; // セクション間スペース
        }
        var secLabel = txt(
          (page.section === '病院サイト' ? '🏥 ' : '👔 ') + page.section,
          30, true, C.primary, 0, rowY
        );
        figma.currentPage.appendChild(secLabel);
        created.push(secLabel);
        rowY += 56;
        currentSection = page.section;
      }

      // フレーム生成・配置
      var frame = buildFrame(page.name, page.type);
      frame.x = colIdx * (FW + HGAP);
      frame.y = rowY;
      figma.currentPage.appendChild(frame);
      created.push(frame);

      colIdx++;
      if (colIdx >= COLS) {
        colIdx = 0;
        rowY += FH + VGAP;
      }
    }

    // ビューに合わせてズーム
    figma.viewport.scrollAndZoomIntoView(created);
    figma.notify('✅ ' + pages.length + 'ページのワイヤーフレームを生成しました！');
    figma.closePlugin();
  }
};
