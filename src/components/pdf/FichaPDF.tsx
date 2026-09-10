import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

/* ══════════════════════════════════════════════════════════════════════════
   CÉDULA CATASTRAL · DOCUMENTO TÉCNICO-FISCAL
   Formato : Papel Oficio venezolano — 216 mm × 330 mm (612 × 936 pt)
   Estilo  : Institucional minimalista · azul marino + grises neutros
   ══════════════════════════════════════════════════════════════════════════ */

const NAVY  = '#13233C';
const INK   = '#1D2530';
const GRAY  = '#5C6874';
const GRAYL = '#8C97A3';
const LINE  = '#CBD3DD';
const SOFT  = '#F3F5F8';

const OFICIO: [number, number] = [612, 936];   // Oficio 216×330 mm
// size="LEGAL" (8.5"×14") · size="A4" — si tu impresora lo exige

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'];

const money = (v: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

const dLong  = (d: Date) => `${String(d.getDate()).padStart(2,'0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
const dShort = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

const hash = (str: string) => {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

/* Código de verificación determinístico (mismo input → mismo output) */
const makeVerif = (str: string) => {
  const h = hash(str);
  return [h & 0xffff, (h >>> 8) & 0xffff, (h >>> 16) & 0xffff]
    .map((n) => n.toString(36).toUpperCase().padStart(4, '0'))
    .join('-');
};

/* Código de barras decorativo (determinístico, sin librerías externas) */
const Barcode = ({ value }: { value: string }) => {
  const bars: { w: number; tall: boolean }[] = [];
  let h = hash(value);
  for (let i = 0; i < 42; i++) {
    h = (h * 137 + 7919) >>> 0;
    bars.push({ w: 0.6 + ((h % 100) / 100) * 1.5, tall: h % 3 === 0 });
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {bars.map((b, i) => (
        <View key={i} style={{ width: b.w, height: b.tall ? 20 : 14, backgroundColor: '#1B2430', marginRight: 0.8 }} />
      ))}
    </View>
  );
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.4,
    color: INK,
    paddingTop: 36,
    paddingBottom: 86,
    paddingHorizontal: 46,
    lineHeight: 1.3,
  },

  /* — Banda superior de control (full-bleed) — */
  controlBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: NAVY,
    marginLeft: -46, marginRight: -46,
    paddingHorizontal: 46, paddingVertical: 4,
  },
  controlTxt: { color: '#FFFFFF', fontSize: 6.3, fontFamily: 'Helvetica-Bold' },

  /* — Encabezado institucional — */
  header: { alignItems: 'center', marginTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  logo: { width: 42, height: 42 },
  headerCenter: { flex: 1, alignItems: 'center' },
  logoSpacer: { width: 42 },
  rep:      { fontSize: 8.2, fontFamily: 'Helvetica-Bold', color: INK, textAlign: 'center' },
  org:      { fontSize: 7.2, color: GRAY, textAlign: 'center', marginTop: 0.5 },
  orgBold:  { fontSize: 7.2, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 0.5 },

  /* — Título — */
  titleBlock: { alignItems: 'center', marginTop: 10 },
  titleRule: { width: 64, height: 1.25, backgroundColor: NAVY, marginBottom: 7 },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'center' },
  subtitle: { fontSize: 6.2, color: GRAYL, marginTop: 4, textAlign: 'center' },

  /* — Franja de datos del documento — */
  docStrip: {
    flexDirection: 'row', marginTop: 13,
    borderTopWidth: 1.25, borderTopColor: NAVY,
    borderBottomWidth: 0.75, borderBottomColor: LINE,
  },
  docCell: { flex: 1, paddingVertical: 5, paddingHorizontal: 8, borderRightWidth: 0.5, borderRightColor: LINE },
  docCellLast: { borderRightWidth: 0 },
  docLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: GRAYL, marginBottom: 1.5 },
  docValue: { fontSize: 8.6, fontFamily: 'Helvetica-Bold', color: NAVY },

  /* — Secciones — */
  section: { marginTop: 12 },
  secHead: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.25, borderBottomColor: NAVY, paddingBottom: 3.5 },
  secNum: { backgroundColor: NAVY, width: 13, paddingTop: 1.5, paddingBottom: 1.5, marginRight: 7, alignItems: 'center' },
  secNumTxt: { color: '#FFF', fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  secTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY },
  secTag: { flex: 1, textAlign: 'right', fontSize: 6, color: GRAYL, fontFamily: 'Helvetica-Bold' },

  /* — Cuerpo tipo tabla — */
  secBody: { borderWidth: 0.5, borderColor: LINE, borderTopWidth: 0 },
  row:     { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINE },
  rowLast: { flexDirection: 'row' },
  cell:     { paddingVertical: 4, paddingHorizontal: 8, borderRightWidth: 0.5, borderRightColor: LINE },
  cellLast: { paddingVertical: 4, paddingHorizontal: 8 },
  label: { fontSize: 6.1, fontFamily: 'Helvetica-Bold', color: GRAY, marginBottom: 1 },
  value: { fontSize: 8.4, color: INK },

  /* — Mini tabla de construcciones — */
  miniHead: { flexDirection: 'row', backgroundColor: SOFT, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3.5, paddingHorizontal: 8 },
  miniRow:  { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3, paddingHorizontal: 8 },
  mh:  { fontSize: 6.1, fontFamily: 'Helvetica-Bold', color: GRAY },
  mc:  { fontSize: 7.6, color: INK },
  mhr: { textAlign: 'right' },

  /* — Tabla de valoración — */
  valTable: { borderWidth: 0.5, borderColor: LINE, borderTopWidth: 0 },
  vRowHead: { flexDirection: 'row', backgroundColor: SOFT, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 4, paddingHorizontal: 8 },
  vRow:     { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 4, paddingHorizontal: 8 },
  vTotal:   { flexDirection: 'row', backgroundColor: NAVY, paddingVertical: 6, paddingHorizontal: 8 },
  vh:  { fontSize: 6.1, fontFamily: 'Helvetica-Bold', color: GRAY },
  vc:  { fontSize: 8.2, color: INK },
  vt:  { color: '#FFF', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  vr:  { textAlign: 'right' },
  alicRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  alic: { fontSize: 7.4, color: GRAY },

  /* — Nota legal — */
  note: { marginTop: 13, backgroundColor: SOFT, borderLeftWidth: 2, borderLeftColor: NAVY, paddingVertical: 6, paddingHorizontal: 10 },
  noteTxt: { fontSize: 6.2, color: GRAY, textAlign: 'justify', lineHeight: 1.5 },

  /* — Firmas — */
  signatures: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 22 },
  sigBlock: { width: '40%', alignItems: 'center' },
  sigLine: { width: '100%', borderBottomWidth: 0.75, borderBottomColor: INK, marginTop: 20, marginBottom: 5 },
  sigName: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: INK, textAlign: 'center' },
  sigRole: { fontSize: 6.5, color: GRAY, marginTop: 1.5, textAlign: 'center' },
  sigInst: { fontSize: 6, color: GRAYL, marginTop: 1, textAlign: 'center' },

  /* — Pie fijo — */
  footer: { position: 'absolute', bottom: 30, left: 46, right: 46, borderTopWidth: 0.75, borderTopColor: LINE, paddingTop: 7 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footLeft: { flexDirection: 'row', alignItems: 'flex-end' },
  footTxt: { fontSize: 5.8, color: GRAYL, lineHeight: 1.7 },
  footPage: { fontSize: 6.2, fontFamily: 'Helvetica-Bold', color: GRAY },
});

/* Campo reutilizable: etiqueta (gris, mayúsculas) + valor */
const F = ({ label, value, flex = 1, last = false }: any) => (
  <View style={[last ? s.cellLast : s.cell, { flex }]}>
    <Text style={s.label}>{label}</Text>
    <Text style={s.value}>
      {value === null || value === undefined || value === '' ? 'S/D' : String(value)}
    </Text>
  </View>
);

export default function FichaPDF({ inmueble, parametros, firmantes, logoUrl, qrDataUrl }: any) {
  const propietarios: any[] = inmueble.propietarios || [];
  const prop = propietarios[0] || { nombre: 'NO REGISTRADO', apellido: '', cedula: 'N/D', telefono: '', email: '', tipo_tenencia: '', porcentaje_propiedad: 100 };

  const construcciones: any[] = inmueble.construcciones || [];
  const totalConstM2 = construcciones.reduce((sum: number, c: any) => sum + (c.area_construida_m2 || 0), 0);

  const valTerrenoM2 = parametros?.valor_m2_terreno ?? 24500;
  const valConstM2   = parametros?.valor_m2_construccion ?? 85400;
  const alicuota     = parametros?.alicuota_impuesto ?? 0.003;

  const m2Terreno       = inmueble.superficie_m2 || 0;
  const valorTerreno    = m2Terreno * valTerrenoM2;
  const valorConstr     = totalConstM2 * valConstM2;
  const valorTotal      = valorTerreno + valorConstr;
  const baseImponible   = valorTotal * alicuota;

  const hoy   = new Date();
  const vence = new Date(hoy.getFullYear() + 3, hoy.getMonth(), hoy.getDate());
  const codigo = inmueble.codigo_catastral || 'S/D';
  const exp = `EXP-${hoy.getFullYear()}-${String(codigo).split('-').pop() || '000'}`;
  const verif = makeVerif(`${codigo}|${exp}|${hoy.getTime()}`);

  const nombreFull = `${prop.nombre || ''} ${prop.apellido || ''}`.trim() || 'NO REGISTRADO';
  const condicion  = `${(prop.tipo_tenencia || 'PROPIETARIO').toString().replace(/_/g, ' ').toUpperCase()} · ${prop.porcentaje_propiedad ?? 100} %`;
  const uso        = (inmueble.tipo_inmueble || 'S/D').toString().toUpperCase();

  return (
    <Document
      title={`Cedula_Catastral_${codigo}`}
      author="Dirección de Catastro y Control Urbano · Alcaldía del Municipio Torbes"
      subject="Cédula Catastral — Documento Técnico-Fiscal"
      creator="Sistema de Gestión Catastral Municipal"
      keywords="catastro, cédula catastral, inmueble, valoración, Torbes"
    >
      <Page size={OFICIO} style={s.page}>

        {/* ══ BANDA DE CONTROL ══ */}
        <View style={s.controlBar}>
          <Text style={s.controlTxt}>EXPEDIENTE {exp}</Text>
          <Text style={s.controlTxt}>DOCUMENTO TÉCNICO-FISCAL</Text>
          <Text style={s.controlTxt}>EMISIÓN {dShort(hoy)}</Text>
        </View>

        {/* ══ ENCABEZADO INSTITUCIONAL ══ */}
        <View style={s.header}>
          {logoUrl ? (
            <View style={s.headerRow}>
              <Image src={logoUrl} style={s.logo} />
              <View style={s.headerCenter}>
                <Text style={s.rep}>REPÚBLICA BOLIVARIANA DE VENEZUELA</Text>
                <Text style={s.org}>ESTADO TÁCHIRA · MUNICIPIO TORBES</Text>
                <Text style={s.org}>ALCALDÍA DEL MUNICIPIO TORBES</Text>
                <Text style={s.orgBold}>DIRECCIÓN DE CATASTRO Y CONTROL URBANO</Text>
              </View>
              <View style={s.logoSpacer} />
            </View>
          ) : (
            <>
              <Text style={s.rep}>REPÚBLICA BOLIVARIANA DE VENEZUELA</Text>
              <Text style={s.org}>ESTADO TÁCHIRA · MUNICIPIO TORBES</Text>
              <Text style={s.org}>ALCALDÍA DEL MUNICIPIO TORBES</Text>
              <Text style={s.orgBold}>DIRECCIÓN DE CATASTRO Y CONTROL URBANO</Text>
            </>
          )}
          <View style={s.titleBlock}>
            <View style={s.titleRule} />
            <Text style={s.title}>C É D U L A   C A T A S T R A L</Text>
            <Text style={s.subtitle}>DOCUMENTO DE CARÁCTER TÉCNICO Y FISCAL · LEY DE GEOGRAFÍA, CARTOGRAFÍA Y CATASTRO NACIONAL</Text>
          </View>
        </View>

        {/* ══ FRANJA DE DATOS DEL DOCUMENTO ══ */}
        <View style={s.docStrip}>
          <View style={s.docCell}>
            <Text style={s.docLabel}>CÓDIGO CATASTRAL</Text>
            <Text style={s.docValue}>{codigo}</Text>
          </View>
          <View style={s.docCell}>
            <Text style={s.docLabel}>N° DE EXPEDIENTE</Text>
            <Text style={s.docValue}>{exp}</Text>
          </View>
          <View style={s.docCell}>
            <Text style={s.docLabel}>FECHA DE EMISIÓN</Text>
            <Text style={s.docValue}>{dShort(hoy)}</Text>
          </View>
          <View style={[s.docCell, s.docCellLast]}>
            <Text style={s.docLabel}>VIGENTE HASTA</Text>
            <Text style={s.docValue}>{dShort(vence)}</Text>
          </View>
        </View>

        {/* ══ 1 · CONTRIBUYENTE ══ */}
        <View style={s.section}>
          <View style={s.secHead}>
            <View style={s.secNum}><Text style={s.secNumTxt}>1</Text></View>
            <Text style={s.secTitle}>IDENTIFICACIÓN DEL CONTRIBUYENTE</Text>
            <Text style={s.secTag}>SEC/01</Text>
          </View>
          <View style={s.secBody}>
            <View style={s.row}>
              <F label="NOMBRE / RAZÓN SOCIAL" value={nombreFull} flex={2.2} />
              <F label="C.I. / R.I.F." value={prop.cedula} last />
            </View>
            <View style={s.rowLast}>
              <F label="TELÉFONO" value={prop.telefono || 'No registrado'} />
              <F label="CORREO ELECTRÓNICO" value={prop.email || 'No registrado'} flex={1.4} />
              <F label="CONDICIÓN · % DE PROPIEDAD" value={condicion} last />
            </View>
          </View>
          {propietarios.length > 1 && (
            <Text style={{ fontSize: 6.2, color: GRAYL, marginTop: 3 }}>
              INCLUYE {propietarios.length - 1} COPROPIETARIO(S) REGISTRADO(S) EN EL EXPEDIENTE ADMINISTRATIVO
            </Text>
          )}
        </View>

        {/* ══ 2 · UBICACIÓN ══ */}
        <View style={s.section}>
          <View style={s.secHead}>
            <View style={s.secNum}><Text style={s.secNumTxt}>2</Text></View>
            <Text style={s.secTitle}>UBICACIÓN DEL INMUEBLE</Text>
            <Text style={s.secTag}>SEC/02</Text>
          </View>
          <View style={s.secBody}>
            <View style={s.row}>
              <F label="URBANIZACIÓN / SECTOR" value={inmueble.barrio} />
              <F label="DIRECCIÓN (CALLE / AVENIDA)" value={inmueble.direccion} flex={2} last />
            </View>
            <View style={s.row}>
              <F label="DESTINO / USO ACTUAL" value={uso} />
              <F label="ZONA CATASTRAL" value={inmueble.zona} />
              <F label="PARROQUIA" value={inmueble.parroquia} last />
            </View>
            <View style={s.rowLast}>
              <F label="LINDERO NORTE" value={inmueble.norte} />
              <F label="LINDERO SUR" value={inmueble.sur} />
              <F label="LINDERO ESTE" value={inmueble.este} />
              <F label="LINDERO OESTE" value={inmueble.oeste} last />
            </View>
          </View>
        </View>

        {/* ══ 3 · DESCRIPCIÓN FÍSICA ══ */}
        <View style={s.section}>
          <View style={s.secHead}>
            <View style={s.secNum}><Text style={s.secNumTxt}>3</Text></View>
            <Text style={s.secTitle}>DESCRIPCIÓN FÍSICA Y MEJORAS</Text>
            <Text style={s.secTag}>SEC/03</Text>
          </View>
          <View style={s.secBody}>
            <View style={construcciones.length ? s.row : s.rowLast}>
              <F label="ÁREA DE TERRENO (m²)" value={`${money(m2Terreno)} m²`} />
              <F label="ÁREA CONSTRUIDA TOTAL (m²)" value={`${money(totalConstM2)} m²`} />
              <F label="MEJORAS REGISTRADAS" value={construcciones.length} last />
            </View>
            {construcciones.length > 0 && (
              <View>
                <View style={s.miniHead}>
                  <Text style={[s.mh, { flex: 0.4 }]}>N°</Text>
                  <Text style={[s.mh, { flex: 2.2 }]}>TIPO DE CONSTRUCCIÓN</Text>
                  <Text style={[s.mh, s.mhr, { flex: 0.8 }]}>NIVELES</Text>
                  <Text style={[s.mh, s.mhr, { flex: 0.8 }]}>AÑO</Text>
                  <Text style={[s.mh, s.mhr, { flex: 1.1 }]}>ÁREA (m²)</Text>
                </View>
                {construcciones.map((c: any, i: number) => (
                  <View key={i} style={i === construcciones.length - 1 ? s.rowLast : s.miniRow}>
                    <Text style={[s.mc, { flex: 0.4 }]}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={[s.mc, { flex: 2.2 }]}>{(c.tipo_construccion || 'CONSTRUCCIÓN').toString().toUpperCase()}</Text>
                    <Text style={[s.mc, s.mhr, { flex: 0.8 }]}>{c.niveles ?? c.nro_niveles ?? 'S/D'}</Text>
                    <Text style={[s.mc, s.mhr, { flex: 0.8 }]}>{c.anio_construccion ?? 'S/D'}</Text>
                    <Text style={[s.mc, s.mhr, { flex: 1.1 }]}>{money(c.area_construida_m2 || 0)}</Text>
                  </View>
                ))}
                <View style={[s.miniRow, { borderBottomWidth: 0, backgroundColor: SOFT }]}>
                  <Text style={[s.mc, { flex: 0.4 }]} />
                  <Text style={[s.mc, { flex: 2.2, fontFamily: 'Helvetica-Bold' }]}>TOTAL CONSTRUIDO</Text>
                  <Text style={[s.mc, { flex: 0.8 }]} />
                  <Text style={[s.mc, { flex: 0.8 }]} />
                  <Text style={[s.mc, s.mhr, { flex: 1.1, fontFamily: 'Helvetica-Bold' }]}>{money(totalConstM2)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ══ 4 · INFORMACIÓN REGISTRAL ══ */}
        <View style={s.section}>
          <View style={s.secHead}>
            <View style={s.secNum}><Text style={s.secNumTxt}>4</Text></View>
            <Text style={s.secTitle}>INFORMACIÓN JURÍDICA REGISTRAL</Text>
            <Text style={s.secTag}>SEC/04</Text>
          </View>
          <View style={s.secBody}>
            <View style={s.row}>
              <F label="OFICINA DE REGISTRO" value="Registro Público — por actualizar (contribuyente)" flex={2} />
              <F label="TOMO / VOLUMEN" value="S/D" last />
            </View>
            <View style={s.rowLast}>
              <F label="N° DE DOCUMENTO" value="S/D" />
              <F label="PROTOCOLO / TRIMESTRE" value="S/D" />
              <F label="FECHA / AÑO DE REGISTRO" value="S/D" last />
            </View>
          </View>
        </View>

        {/* ══ 5 · VALORACIÓN ══ */}
        <View style={s.section}>
          <View style={s.secHead}>
            <View style={s.secNum}><Text style={s.secNumTxt}>5</Text></View>
            <Text style={s.secTitle}>VALORACIÓN CATASTRAL Y TRIBUTO</Text>
            <Text style={s.secTag}>SEC/05</Text>
          </View>
          <View style={s.valTable}>
            <View style={s.vRowHead}>
              <Text style={[s.vh, { flex: 3 }]}>CONCEPTO</Text>
              <Text style={[s.vh, s.vr, { flex: 1.2 }]}>ÁREA (m²)</Text>
              <Text style={[s.vh, s.vr, { flex: 1.4 }]}>VALOR UNIT. (BS./m²)</Text>
              <Text style={[s.vh, s.vr, { flex: 1.6 }]}>VALOR TOTAL (BS.)</Text>
            </View>
            <View style={s.vRow}>
              <Text style={[s.vc, { flex: 3 }]}>TERRENO</Text>
              <Text style={[s.vc, s.vr, { flex: 1.2 }]}>{money(m2Terreno)}</Text>
              <Text style={[s.vc, s.vr, { flex: 1.4 }]}>{money(valTerrenoM2)}</Text>
              <Text style={[s.vc, s.vr, { flex: 1.6, fontFamily: 'Helvetica-Bold' }]}>{money(valorTerreno)}</Text>
            </View>
            {totalConstM2 > 0 && (
              <View style={s.vRow}>
                <Text style={[s.vc, { flex: 3 }]}>CONSTRUCCIONES</Text>
                <Text style={[s.vc, s.vr, { flex: 1.2 }]}>{money(totalConstM2)}</Text>
                <Text style={[s.vc, s.vr, { flex: 1.4 }]}>{money(valConstM2)}</Text>
                <Text style={[s.vc, s.vr, { flex: 1.6, fontFamily: 'Helvetica-Bold' }]}>{money(valorConstr)}</Text>
              </View>
            )}
            <View style={s.vTotal}>
              <Text style={[s.vt, { flex: 3 }]}>VALOR CATASTRAL TOTAL</Text>
              <Text style={[s.vt, { flex: 1.2 }]} />
              <Text style={[s.vt, { flex: 1.4 }]} />
              <Text style={[s.vt, s.vr, { flex: 1.6, fontSize: 10 }]}>Bs. {money(valorTotal)}</Text>
            </View>
          </View>
          <View style={s.alicRow}>
            <Text style={s.alic}>ALÍCUOTA APLICADA: {(alicuota * 100).toFixed(2)} %</Text>
            <Text style={[s.alic, { fontFamily: 'Helvetica-Bold', color: NAVY }]}>
              BASE IMPONIBLE ANUAL: Bs. {money(baseImponible)}
            </Text>
          </View>
        </View>

        {/* ══ NOTA LEGAL ══ */}
        <View style={s.note}>
          <Text style={s.noteTxt}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: GRAY }}>NOTA · </Text>
            La presente Cédula Catastral tiene carácter estrictamente técnico y fiscal de conformidad con la Ley de
            Geografía, Cartografía y Catastro Nacional. No constituye título de propiedad ni subsana vicios que afecten
            el derecho de posesión o propiedad del inmueble. El contribuyente está obligado a notificar a esta Dirección
            cualquier modificación física, jurídica o económica del inmueble dentro de los treinta (30) días siguientes
            a su ocurrencia.
          </Text>
        </View>

        {/* ══ FIRMAS ══ */}
        <View style={s.signatures}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{firmantes?.analista || 'Analista de Catastro'}</Text>
            <Text style={s.sigRole}>ANALISTA DE CATASTRO · ELABORÓ</Text>
            <Text style={s.sigInst}>DIRECCIÓN DE CATASTRO Y CONTROL URBANO</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{firmantes?.director || 'Director(a) de Catastro'}</Text>
            <Text style={s.sigRole}>DIRECTOR(A) · REVISIÓN Y APROBACIÓN</Text>
            <Text style={s.sigInst}>FIRMA Y SELLO OFICIAL</Text>
          </View>
        </View>

        {/* ══ PIE DE PÁGINA FIJO ══ */}
        <View style={s.footer} fixed>
          <View style={s.footRow}>
            <View style={s.footLeft}>
              {qrDataUrl ? (
                <Image src={qrDataUrl} style={{ width: 45, height: 45 }} />
              ) : (
                <Barcode value={`${codigo}|${verif}`} />
              )}
              <View style={{ marginLeft: 10 }}>
                <Text style={s.footTxt}>CÓDIGO DE VERIFICACIÓN: {verif}</Text>
                <Text style={s.footTxt}>CONSULTA: catastro.torbes.gob.ve/verificacion</Text>
                <Text style={s.footTxt}>EMITIDO: {dLong(hoy)}</Text>
              </View>
            </View>
            <Text
              style={s.footPage}
              render={({ pageNumber }: any) => `PÁGINA ${pageNumber} · CÉDULA CATASTRAL ${codigo}`}
            />
          </View>
        </View>

      </Page>
    </Document>
  );
}