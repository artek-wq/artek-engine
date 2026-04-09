/**
 * AvisoGenerator.js
 * Genera PDFs de Aviso (General, Arribo, Zarpe) desde datos de una operación.
 * Usa jsPDF vía CDN (cargado dinámicamente) — sin instalación.
 */

// ─── Carga dinámica de jsPDF ────────────────────────────────────────────────
async function loadJsPDF() {
    if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function val(v) { return v || '—'; }

// ─── COLORES ──────────────────────────────────────────────────────────────────
const C = {
    azul: [0, 71, 171],
    azulClaro: [0, 91, 187],
    gris: [80, 80, 80],
    grisClaro: [245, 245, 248],
    borde: [210, 215, 225],
    negro: [30, 30, 30],
    blanco: [255, 255, 255],
    accent: [220, 50, 50],
};

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────
export async function generarAviso(operacion, tipoAviso, proveedores = []) {
    const JsPDF = await loadJsPDF();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    const PW = 215.9; // letter width mm
    const PH = 279.4; // letter height mm
    const ML = 14;    // margin left
    const MR = 14;    // margin right
    const CW = PW - ML - MR; // content width
    let y = 0;

    const titulos = {
        general: 'AVISO GENERAL DE EMBARQUE',
        arribo: 'AVISO DE ARRIBO',
        zarpe: 'AVISO DE ZARPE',
    };

    // ── CABECERA AZUL ────────────────────────────────────────────────────────
    // Banda superior azul
    doc.setFillColor(...C.azul);
    doc.rect(0, 0, PW, 18, 'F');

    // ARTEK LOGISTIC (izquierda)
    doc.setTextColor(...C.blanco);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ARTEK LOGISTIC', ML, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Logística Internacional', ML, 15.5);

    // Línea separadora vertical
    doc.setDrawColor(...C.blanco);
    doc.setLineWidth(0.3);
    doc.line(76, 3, 76, 15);

    // Título del aviso (centro-derecha)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const titulo = titulos[tipoAviso] || 'AVISO DE EMBARQUE';
    doc.text(titulo, PW / 2 + 10, 8, { align: 'center' });

    // Referencia / número de operación
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Ref: ${val(operacion.referencia)}`, PW / 2 + 10, 13.5, { align: 'center' });

    // Fecha generación (derecha)
    doc.setFontSize(7);
    doc.text(`Generado: ${fmtDate(new Date().toISOString())}`, PW - MR, 15.5, { align: 'right' });

    y = 24;

    // ── Helpers de dibujo ────────────────────────────────────────────────────
    const sectionHeader = (label, yPos) => {
        doc.setFillColor(...C.azul);
        doc.rect(ML, yPos, CW, 5.5, 'F');
        doc.setTextColor(...C.blanco);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(label.toUpperCase(), ML + 2, yPos + 3.8);
        return yPos + 5.5;
    };

    const fieldBox = (label, value, x, yPos, w) => {
        doc.setFillColor(...C.grisClaro);
        doc.setDrawColor(...C.borde);
        doc.setLineWidth(0.2);
        doc.rect(x, yPos, w, 8.5, 'FD');
        doc.setTextColor(...C.gris);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text(label.toUpperCase(), x + 2, yPos + 3);
        doc.setTextColor(...C.negro);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(String(value || '—').substring(0, Math.floor(w / 1.8)), x + 2, yPos + 7);
    };

    const twoCol = (l1, v1, l2, v2, yPos) => {
        const half = CW / 2;
        fieldBox(l1, v1, ML, yPos, half - 0.5);
        fieldBox(l2, v2, ML + half + 0.5, yPos, half - 0.5);
        return yPos + 8.5;
    };

    const fourCol = (fields, yPos) => {
        const w = CW / 4;
        fields.forEach(([l, v], i) => fieldBox(l, v, ML + i * w, yPos, w));
        return yPos + 8.5;
    };

    // ── BLOQUE SHIPPER / CONSIGNEE ──────────────────────────────────────────
    y = sectionHeader('Partes involucradas', y);
    y = twoCol('Shipper / Embarcador', operacion.shipper, 'Consignee / Consignatario', operacion.clientes?.nombre, y);
    y = twoCol('Cliente', operacion.clientes?.nombre, 'Incoterms', operacion.incoterms, y);
    y += 2;

    // ── BLOQUE DESCRIPCIÓN CARGA ─────────────────────────────────────────────
    y = sectionHeader('Descripción de la carga', y);
    y = fourCol([
        ['Peso', operacion.peso ? `${operacion.peso} KG` : '—'],
        ['Volumen (CBM)', operacion.cbm ? `${operacion.cbm} M3` : '—'],
        ['Bultos / Piezas', val(operacion.bultos)],
        ['Contenedor', val(operacion.contenedor)],
    ], y);
    y += 2;

    // ── BLOQUE RUTA ──────────────────────────────────────────────────────────
    y = sectionHeader('Información de ruta', y);
    y = fourCol([
        ['Puerto de Carga (POL)', val(operacion.origen)],
        ['Puerto de Descarga (POD)', val(operacion.destino)],
        ['Origen', val(operacion.origen)],
        ['Destino Final', val(operacion.destino)],
    ], y);
    y += 2;

    // ── BLOQUE ROUTING INFO (tabla con modo, buque, etc.) ───────────────────
    y = sectionHeader('Routing / Transporte', y);

    const tipoLabel = {
        M: 'SEA / Marítimo',
        A: 'AIR / Aéreo',
        T: 'TRUCK / Terrestre',
        D: 'Despacho Aduanal',
        P: 'Paquetería',
    }[operacion.tipo_operacion] || val(operacion.tipo_operacion);

    y = twoCol('Modo de transporte', tipoLabel, 'MBL / Master BL', operacion.mbl, y);
    y = twoCol('HBL / House BL', operacion.hbl, 'Buque / Vuelo / Unidad', operacion.contenedor, y);

    if (operacion.aseguradora) {
        y = twoCol('Aseguradora', operacion.aseguradora, 'Proveedor(es)', proveedores.join(', '), y);
    } else {
        fieldBox('Proveedor(es)', proveedores.join(', ') || '—', ML, y, CW);
        y += 8.5;
    }
    y += 2;

    // ── BLOQUE FECHAS (según tipo de aviso) ─────────────────────────────────
    y = sectionHeader(
        tipoAviso === 'zarpe' ? 'Datos de Zarpe' :
            tipoAviso === 'arribo' ? 'Datos de Arribo / ETA' :
                'Fechas clave',
        y
    );

    if (tipoAviso === 'arribo') {
        // ETA destacada
        const etaStr = operacion.eta ? fmtDate(operacion.eta) : 'POR CONFIRMAR';
        doc.setFillColor(230, 244, 255);
        doc.setDrawColor(...C.azulClaro);
        doc.setLineWidth(0.4);
        doc.rect(ML, y, CW, 14, 'FD');
        doc.setTextColor(...C.azul);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('ESTIMATED TIME OF ARRIVAL (ETA)', ML + 4, y + 5);
        doc.setFontSize(16);
        doc.text(etaStr, ML + 4, y + 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.gris);
        doc.text(`ETD Zarpe: ${fmtDate(operacion.etd)}`, PW - MR - 2, y + 7, { align: 'right' });
        doc.text(`Puerto de Descarga: ${val(operacion.destino)}`, PW - MR - 2, y + 12, { align: 'right' });
        y += 16;
    } else if (tipoAviso === 'zarpe') {
        // ETD destacada
        const etdStr = operacion.etd ? fmtDate(operacion.etd) : 'POR CONFIRMAR';
        doc.setFillColor(230, 244, 230);
        doc.setDrawColor(0, 140, 70);
        doc.setLineWidth(0.4);
        doc.rect(ML, y, CW, 14, 'FD');
        doc.setTextColor(0, 120, 60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('ESTIMATED TIME OF DEPARTURE (ETD)', ML + 4, y + 5);
        doc.setFontSize(16);
        doc.text(etdStr, ML + 4, y + 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.gris);
        doc.text(`ETA Llegada: ${fmtDate(operacion.eta)}`, PW - MR - 2, y + 7, { align: 'right' });
        doc.text(`Puerto de Carga: ${val(operacion.origen)}`, PW - MR - 2, y + 12, { align: 'right' });
        y += 16;
    } else {
        y = twoCol('ETD (Zarpe)', fmtDate(operacion.etd), 'ETA (Arribo)', fmtDate(operacion.eta), y);
    }
    y += 2;

    // ── NOTAS ────────────────────────────────────────────────────────────────
    if (operacion.notas) {
        y = sectionHeader('Notas / Observaciones', y);
        doc.setFillColor(...C.grisClaro);
        doc.setDrawColor(...C.borde);
        doc.setLineWidth(0.2);
        const notasLines = doc.splitTextToSize(operacion.notas, CW - 4);
        const notasH = Math.max(12, notasLines.length * 4 + 4);
        doc.rect(ML, y, CW, notasH, 'FD');
        doc.setTextColor(...C.negro);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(notasLines, ML + 2, y + 4);
        y += notasH + 2;
    }

    // ── INSTRUCCIONES ESPECIALES (Arribo) ────────────────────────────────────
    if (tipoAviso === 'arribo') {
        y = sectionHeader('Proceso de liberación', y);
        const instrucciones = [
            '1. Verificar instrucción de liberación indicada en el HBL.',
            '2. Proporcionar datos del Agente Aduanal: Nombre y Número de Patente.',
            '3. Cubrir gastos locales y enviar comprobante con número de referencia.',
            '4. Coordinar con el Agente Aduanal para la revalidación electrónica.',
        ];
        doc.setFillColor(...C.grisClaro);
        doc.setDrawColor(...C.borde);
        doc.setLineWidth(0.2);
        doc.rect(ML, y, CW, instrucciones.length * 5 + 4, 'FD');
        doc.setTextColor(...C.negro);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        instrucciones.forEach((line, i) => {
            doc.text(line, ML + 3, y + 5 + i * 5);
        });
        y += instrucciones.length * 5 + 6;
    }

    // ── FIRMA / PIE ──────────────────────────────────────────────────────────
    // Línea separadora
    doc.setDrawColor(...C.borde);
    doc.setLineWidth(0.4);
    doc.line(ML, y + 4, PW - MR, y + 4);
    y += 8;

    doc.setTextColor(...C.negro);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ARTEK LOGISTIC', ML, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gris);
    doc.text('Logística Internacional · México', ML, y + 4.5);

    // Status de la operación (derecha)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.azul);
    doc.text(`Status: ${val(operacion.status_especifico || operacion.status)}`, PW - MR, y, { align: 'right' });

    // ── FOOTER ────────────────────────────────────────────────────────────────
    doc.setFillColor(...C.azul);
    doc.rect(0, PH - 8, PW, 8, 'F');
    doc.setTextColor(...C.blanco);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(
        `Documento generado por Artek Engine · ${new Date().toLocaleString('es-MX')} · Este documento es de carácter informativo.`,
        PW / 2, PH - 3.5, { align: 'center' }
    );

    // ── GUARDAR ───────────────────────────────────────────────────────────────
    const filename = `Aviso_${tipoAviso}_${val(operacion.referencia)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    return filename;
}
