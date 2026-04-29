(function () {
    const translations = {
        en: {
            pageTitle: "Szeged Wells Dashboard",
            hero: {
                eyebrow: "Local Geoinformatics Dashboard",
                title: "Szeged Wells Interpolation Viewer",
                copy: "Explore groundwater well measurements, compare parameter values through time, and generate a purple-tinted interpolation surface directly on the map.",
                badgeLabel: "Backend",
            },
            controls: {
                title: "Controls",
                description: "Choose a parameter and a time step, then refresh the surface.",
                language: "Language",
                parameter: "Parameter",
                time: "Time / Date",
                opacity: "Interpolation opacity",
                refresh: "Refresh Interpolation",
            },
            detected: {
                title: "Detected Fields",
                description: "Automatic CSV and shapefile detection from the backend.",
                x: "X / Lon column",
                y: "Y / Lat column",
                timeSource: "Time source",
                wellSource: "Well column",
            },
            legend: {
                title: "Legend",
                description: "The same color ramp is used for the points and the surface.",
                points: "Well Points",
                surface: "Interpolated Surface",
                mapTitle: "Map Legend",
            },
            summary: {
                parameter: "Parameter",
                time: "Time",
                validWells: "Valid wells",
            },
            popup: {
                well: "Well",
                parameter: "Parameter",
                time: "Time",
                sampleCount: "Samples averaged",
            },
            layers: {
                openStreetMap: "OpenStreetMap",
                boundary: "Boundary",
                wellPoints: "Well points",
                surface: "Interpolation surface",
            },
            messages: {
                loadingMetadata: "Loading dashboard metadata...",
                metadataLoaded: "Metadata loaded. Building the first map view...",
                chooseSelection: "Choose a parameter and a time value to continue.",
                loadingUpdate: "Loading well points and interpolation...",
                loadedWellsAndSurface: "Loaded {count} wells and refreshed the {method} surface.",
                loadedWellsNoSurface: "Loaded {count} wells. Interpolation is unavailable for this selection.",
                updateFailed: "Something went wrong while updating the map.",
                initFailed: "The dashboard could not be initialized.",
                requestFailed: "Request failed.",
                noPointDataYet: "No data loaded yet.",
                noSurfaceLoadedYet: "No surface loaded yet.",
                waitingForData: "Waiting for data...",
                noPointValuesAvailable: "No point values available.",
                noSurfaceAvailable: "No interpolation surface available.",
                noSurfaceLegendAvailable: "No interpolation legend available.",
                notDetected: "Not detected",
                generatedLabels: "Generated labels",
                valuesCount: "{label} ({count} values)",
            },
            warnings: {
                noValidPoints: "No valid points were found for the selected parameter and time.",
                minPoints: "At least {count} valid wells are needed for interpolation.",
                maskEmpty: "Interpolation was created, but nothing overlapped the boundary mask.",
            },
            errors: {
                unknownParameter: "The selected parameter is not available.",
                unknownTime: "The selected time value is not available for this parameter.",
                generic: "An unexpected error occurred.",
            },
            timeWords: {
                year: "Year",
                month: "Month",
                day: "Day",
            },
            timeFormats: {
                yearOnly: "{yearLabel} {year}",
                yearMonth: "{yearLabel} {year} / {monthLabel} {month}",
                yearMonthDay: "{yearLabel} {year} / {monthLabel} {month} / {dayLabel} {day}",
            },
        },
        zh: {
            pageTitle: "塞格德水井仪表板",
            hero: {
                eyebrow: "本地地理信息仪表板",
                title: "塞格德水井插值查看器",
                copy: "浏览地下水井监测结果，比较不同时间的参数值，并直接在地图上生成紫色插值表面。",
                badgeLabel: "后端",
            },
            controls: {
                title: "控制面板",
                description: "选择参数和时间步，然后刷新插值表面。",
                language: "语言",
                parameter: "参数",
                time: "时间 / 日期",
                opacity: "插值透明度",
                refresh: "刷新插值",
            },
            detected: {
                title: "检测到的字段",
                description: "来自后端的 CSV 与 shapefile 自动识别结果。",
                x: "X / 经度列",
                y: "Y / 纬度列",
                timeSource: "时间来源",
                wellSource: "水井列",
            },
            legend: {
                title: "图例",
                description: "点位和插值表面使用相同的颜色带。",
                points: "水井点位",
                surface: "插值表面",
                mapTitle: "地图图例",
            },
            summary: {
                parameter: "参数",
                time: "时间",
                validWells: "有效水井",
            },
            popup: {
                well: "水井",
                parameter: "参数",
                time: "时间",
                sampleCount: "平均样本数",
            },
            layers: {
                openStreetMap: "OpenStreetMap",
                boundary: "边界",
                wellPoints: "水井点位",
                surface: "插值表面",
            },
            messages: {
                loadingMetadata: "正在加载仪表板元数据...",
                metadataLoaded: "元数据已加载，正在构建初始地图视图...",
                chooseSelection: "请选择参数和时间值后继续。",
                loadingUpdate: "正在加载水井点位和插值结果...",
                loadedWellsAndSurface: "已加载 {count} 个水井，并刷新了 {method} 表面。",
                loadedWellsNoSurface: "已加载 {count} 个水井。当前选择无法生成插值。",
                updateFailed: "更新地图时出现问题。",
                initFailed: "无法初始化仪表板。",
                requestFailed: "请求失败。",
                noPointDataYet: "尚未加载数据。",
                noSurfaceLoadedYet: "尚未加载表面。",
                waitingForData: "正在等待数据...",
                noPointValuesAvailable: "没有可用的点值。",
                noSurfaceAvailable: "没有可用的插值表面。",
                noSurfaceLegendAvailable: "没有可用的插值图例。",
                notDetected: "未检测到",
                generatedLabels: "自动生成标签",
                valuesCount: "{label}（{count} 个值）",
            },
            warnings: {
                noValidPoints: "所选参数和时间没有有效点位。",
                minPoints: "插值至少需要 {count} 个有效水井。",
                maskEmpty: "插值已创建，但没有结果落在边界掩膜内。",
            },
            errors: {
                unknownParameter: "所选参数不可用。",
                unknownTime: "所选时间值不适用于当前参数。",
                generic: "发生了意外错误。",
            },
            timeWords: {
                year: "年",
                month: "月",
                day: "日",
            },
            timeFormats: {
                yearOnly: "{yearLabel}{year}",
                yearMonth: "{yearLabel}{year} / {monthLabel}{month}",
                yearMonthDay: "{yearLabel}{year} / {monthLabel}{month} / {dayLabel}{day}",
            },
        },
        ku: {
            pageTitle: "داشبۆردی بیرەکانی سێگێد",
            hero: {
                eyebrow: "داشبۆردی ناوخۆی زانیاریی جوگرافی",
                title: "بینەری هاوکێشەی بیرەکانی سێگێد",
                copy: "پشکنینی ئەنجامەکانی پێوانەی ئاوی ژێر زەوی بکە، بەهای پارامێتەرەکان بە پێی کات بەراورد بکە، و ڕووکارێکی هاوکێشەی مۆر لەسەر نەخشە دروست بکە.",
                badgeLabel: "باکەند",
            },
            controls: {
                title: "کۆنترۆڵەکان",
                description: "پارامێتەر و هەنگاوی کات هەڵبژێرە، پاشان ڕووکارەکە نوێ بکەرەوە.",
                language: "زمان",
                parameter: "پارامێتەر",
                time: "کات / بەروار",
                opacity: "ڕوونایی هاوکێشە",
                refresh: "نوێکردنەوەی هاوکێشە",
            },
            detected: {
                title: "خانە دۆزراوەکان",
                description: "ناسینەوەی خۆکارانەی CSV و shapefile لە لایەن باکەندەوە.",
                x: "ستونی X / درێژی",
                y: "ستونی Y / پانی",
                timeSource: "سەرچاوەی کات",
                wellSource: "ستونی بیر",
            },
            legend: {
                title: "ڕوونکردنەوە",
                description: "هەمان ڕەنگبەندی بۆ خاڵەکان و ڕووکارەکە بەکاردێت.",
                points: "خاڵەکانی بیر",
                surface: "ڕووکارێکی هاوکێشە",
                mapTitle: "ڕوونکردنەوەی نەخشە",
            },
            summary: {
                parameter: "پارامێتەر",
                time: "کات",
                validWells: "بیرە بەردەستەکان",
            },
            popup: {
                well: "بیر",
                parameter: "پارامێتەر",
                time: "کات",
                sampleCount: "ژمارەی نمونەی ناوەندی",
            },
            layers: {
                openStreetMap: "OpenStreetMap",
                boundary: "سنوور",
                wellPoints: "خاڵەکانی بیر",
                surface: "ڕووکارێکی هاوکێشە",
            },
            messages: {
                loadingMetadata: "زانیاری بنەڕەتی داشبۆرد بار دەکرێت...",
                metadataLoaded: "زانیاری بنەڕەتی بار بوو، یەکەم دیمەنی نەخشە دروست دەکرێت...",
                chooseSelection: "تکایە پارامێتەر و بەهای کات هەڵبژێرە.",
                loadingUpdate: "خاڵەکانی بیر و هاوکێشە بار دەکرێن...",
                loadedWellsAndSurface: "{count} بیر بار کران و ڕووکارەی {method} نوێ کرایەوە.",
                loadedWellsNoSurface: "{count} بیر بار کران. بۆ ئەم هەڵبژاردنە هاوکێشە بەردەست نییە.",
                updateFailed: "لە نوێکردنەوەی نەخشەدا هەڵەیەک ڕوویدا.",
                initFailed: "دەستپێکردنی داشبۆرد سەرکەوتوو نەبوو.",
                requestFailed: "داواکاری سەرکەوتوو نەبوو.",
                noPointDataYet: "هێشتا هیچ داتایەک بار نەکراوە.",
                noSurfaceLoadedYet: "هێشتا هیچ ڕووکارێک بار نەکراوە.",
                waitingForData: "چاوەڕوانی داتا بکە...",
                noPointValuesAvailable: "هیچ بەهای خاڵی بەردەست نییە.",
                noSurfaceAvailable: "هیچ ڕووکارێکی هاوکێشە بەردەست نییە.",
                noSurfaceLegendAvailable: "هیچ ڕوونکردنەوەیەکی هاوکێشە بەردەست نییە.",
                notDetected: "نەدۆزرایەوە",
                generatedLabels: "ناونیشانی دروستکراو",
                valuesCount: "{label} ({count} بەها)",
            },
            warnings: {
                noValidPoints: "بۆ پارامێتەر و کاتی هەڵبژێردراو هیچ خاڵێکی دروست نەدۆزرایەوە.",
                minPoints: "بۆ هاوکێشە دستکەم {count} بیری دروست پێویستە.",
                maskEmpty: "هاوکێشە دروست کرا، بەڵام هیچ ئەنجامێک لەناو ماسکی سنووردا نەبوو.",
            },
            errors: {
                unknownParameter: "پارامێتەری هەڵبژێردراو بەردەست نییە.",
                unknownTime: "بەهای کاتی هەڵبژێردراو بۆ ئەم پارامێتەرە بەردەست نییە.",
                generic: "هەڵەیەکی چاوەڕواننەکراو ڕوویدا.",
            },
            timeWords: {
                year: "ساڵ",
                month: "مانگ",
                day: "ڕۆژ",
            },
            timeFormats: {
                yearOnly: "{yearLabel} {year}",
                yearMonth: "{yearLabel} {year} / {monthLabel} {month}",
                yearMonthDay: "{yearLabel} {year} / {monthLabel} {month} / {dayLabel} {day}",
            },
        },
        hu: {
            pageTitle: "Szegedi kutak irányítópult",
            hero: {
                eyebrow: "Helyi geoinformatikai irányítópult",
                title: "Szegedi kutak interpolációs nézete",
                copy: "Tekintsd át a felszín alatti vízkutak méréseit, hasonlítsd össze a paraméterértékeket időben, és készíts lila árnyalatú interpolációs felszínt közvetlenül a térképen.",
                badgeLabel: "Háttérrendszer",
            },
            controls: {
                title: "Vezérlők",
                description: "Válassz paramétert és időlépést, majd frissítsd a felszínt.",
                language: "Nyelv",
                parameter: "Paraméter",
                time: "Idő / dátum",
                opacity: "Interpoláció átlátszatlansága",
                refresh: "Interpoláció frissítése",
            },
            detected: {
                title: "Felismert mezők",
                description: "Automatikus CSV- és shapefile-felismerés a háttérrendszerből.",
                x: "X / hosszúság oszlop",
                y: "Y / szélesség oszlop",
                timeSource: "Időforrás",
                wellSource: "Kút oszlop",
            },
            legend: {
                title: "Jelmagyarázat",
                description: "Ugyanaz a színskála jelenik meg a pontoknál és a felszínnél is.",
                points: "Kútpontok",
                surface: "Interpolált felszín",
                mapTitle: "Térképi jelmagyarázat",
            },
            summary: {
                parameter: "Paraméter",
                time: "Idő",
                validWells: "Érvényes kutak",
            },
            popup: {
                well: "Kút",
                parameter: "Paraméter",
                time: "Idő",
                sampleCount: "Átlagolt minták száma",
            },
            layers: {
                openStreetMap: "OpenStreetMap",
                boundary: "Határvonal",
                wellPoints: "Kútpontok",
                surface: "Interpolációs felszín",
            },
            messages: {
                loadingMetadata: "Az irányítópult metaadatai betöltődnek...",
                metadataLoaded: "A metaadatok betöltődtek. Az első térképi nézet készül...",
                chooseSelection: "A folytatáshoz válassz paramétert és időértéket.",
                loadingUpdate: "Kútpontok és interpoláció töltése...",
                loadedWellsAndSurface: "{count} kút betöltve, a(z) {method} felszín frissítve.",
                loadedWellsNoSurface: "{count} kút betöltve. Ehhez a választáshoz nem érhető el interpoláció.",
                updateFailed: "Hiba történt a térkép frissítése közben.",
                initFailed: "Az irányítópult nem inicializálható.",
                requestFailed: "A kérés sikertelen volt.",
                noPointDataYet: "Még nincs betöltött adat.",
                noSurfaceLoadedYet: "Még nincs betöltött felszín.",
                waitingForData: "Várakozás adatokra...",
                noPointValuesAvailable: "Nincsenek elérhető pontértékek.",
                noSurfaceAvailable: "Nem érhető el interpolációs felszín.",
                noSurfaceLegendAvailable: "Nem érhető el interpolációs jelmagyarázat.",
                notDetected: "Nem észlelhető",
                generatedLabels: "Generált címkék",
                valuesCount: "{label} ({count} érték)",
            },
            warnings: {
                noValidPoints: "A kiválasztott paraméterhez és időhöz nem található érvényes pont.",
                minPoints: "Interpolációhoz legalább {count} érvényes kút szükséges.",
                maskEmpty: "Az interpoláció elkészült, de semmi nem fedte át a határmaszkot.",
            },
            errors: {
                unknownParameter: "A kiválasztott paraméter nem érhető el.",
                unknownTime: "A kiválasztott időérték nem érhető el ehhez a paraméterhez.",
                generic: "Váratlan hiba történt.",
            },
            timeWords: {
                year: "Év",
                month: "Hónap",
                day: "Nap",
            },
            timeFormats: {
                yearOnly: "{yearLabel} {year}",
                yearMonth: "{yearLabel} {year} / {monthLabel} {month}",
                yearMonthDay: "{yearLabel} {year} / {monthLabel} {month} / {dayLabel} {day}",
            },
        },
    };

    const languageLabels = {
        en: "English",
        zh: "中文",
        ku: "Kurdish / کوردی",
        hu: "Magyar",
    };

    const storageKey = "dashboardLanguage";
    const defaultLanguage = "en";
    const rtlLanguages = new Set(["ku"]);

    function getValueByPath(source, path) {
        return path.split(".").reduce((current, key) => {
            if (current && Object.prototype.hasOwnProperty.call(current, key)) {
                return current[key];
            }
            return undefined;
        }, source);
    }

    function interpolate(template, params) {
        return String(template).replace(/\{(\w+)\}/g, (match, key) => {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                return params[key];
            }
            return match;
        });
    }

    function t(language, key, params = {}) {
        const template =
            getValueByPath(translations[language], key) ??
            getValueByPath(translations[defaultLanguage], key) ??
            key;
        return interpolate(template, params);
    }

    function isSupportedLanguage(language) {
        return Object.prototype.hasOwnProperty.call(languageLabels, language);
    }

    function isRtlLanguage(language) {
        return rtlLanguages.has(language);
    }

    window.DashboardI18n = {
        translations,
        languageLabels,
        storageKey,
        defaultLanguage,
        t,
        isSupportedLanguage,
        isRtlLanguage,
    };
}());
