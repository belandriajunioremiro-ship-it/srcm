import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

/* ══════════════════════════════════════════════════════════════════════════
   CÉDULA CATASTRAL · DISEÑO DE ALTA GAMA TIPO CERTIFICADO OFICIAL
   ══════════════════════════════════════════════════════════════════════════ */

const NAVY = '#0F172A';     // Slate 900 - Azul muy oscuro, muy elegante
const INK  = '#1E293B';     // Slate 800 - Texto principal
const GRAY = '#475569';     // Slate 600 - Etiquetas
const SOFT = '#F1F5F9';     // Slate 100 - Fondos suaves
const BORDER = '#CBD5E1';   // Slate 300 - Bordes sutiles

const OFICIO: [number, number] = [612, 936]; // Oficio venezolano

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const money = (v: number) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const dLong = (d: Date) => `${String(d.getDate()).padStart(2,'0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
const dShort = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

const hash = (str: string) => {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const makeVerif = (str: string) => {
  const h = hash(str);
  return [h & 0xffff, (h >>> 8) & 0xffff, (h >>> 16) & 0xffff]
    .map((n) => n.toString(36).toUpperCase().padStart(4, '0'))
    .join('-');
};

const s = StyleSheet.create({
  page: { padding: 30, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  
  /* MARCO DEL DOCUMENTO TIPO CERTIFICADO */
  frameOuter: { flex: 1, border: `2pt solid ${NAVY}`, padding: 3 },
  frameInner: { flex: 1, border: `0.5pt solid ${NAVY}`, padding: 25, position: 'relative' },
  
  /* ENCABEZADO */
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logoBox: { width: 55, height: 55, justifyContent: 'center', alignItems: 'center' },
  logoPlaceholder: { width: 45, height: 45, backgroundColor: SOFT, border: `1pt dashed ${BORDER}` },
  headerText: { flex: 1, textAlign: 'center', paddingHorizontal: 10 },
  rep: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: 0.5 },
  est: { fontSize: 7.5, color: GRAY, marginTop: 2, letterSpacing: 0.5 },
  dir: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 2 },
  
  /* QR ARRIBA A LA DERECHA */
  qrBox: { width: 55, height: 55, alignItems: 'flex-end', justifyContent: 'center' },
  qrImg: { width: 55, height: 55 },
  
  /* TÍTULO DEL DOCUMENTO */
  titleContainer: { alignItems: 'center', marginVertical: 15 },
  titleBox: { backgroundColor: NAVY, paddingVertical: 6, paddingHorizontal: 40, borderRadius: 2 },
  title: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Helvetica-Bold', letterSpacing: 3 },
  subtitle: { fontSize: 6.5, color: GRAY, marginTop: 4, letterSpacing: 1 },
  
  /* BLOQUES / SECCIONES */
  section: { marginBottom: 15, border: `1pt solid ${NAVY}` },
  secHeader: { backgroundColor: SOFT, padding: 5, borderBottom: `1pt solid ${NAVY}` },
  secTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 1 },
  
  /* FILAS Y CELDAS */
  row: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}` },
  rowLast: { flexDirection: 'row' },
  cell: { flex: 1, padding: 5, borderRight: `0.5pt solid ${BORDER}` },
  cellLast: { flex: 1, padding: 5 },
  cell2x: { flex: 2, padding: 5, borderRight: `0.5pt solid ${BORDER}` },
  
  lbl: { fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: GRAY, marginBottom: 2 },
  val: { fontSize: 8.5, color: INK },
  valCode: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY }, // Destaca el código catastral
  
  /* AVALÚO */
  vRowH: { flexDirection: 'row', backgroundColor: SOFT, borderBottom: `0.5pt solid ${BORDER}`, padding: 4 },
  vRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, padding: 5 },
  vh: { fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: GRAY },
  vc: { fontSize: 8.5, color: INK },
  vTotalBox: { flexDirection: 'row', backgroundColor: NAVY, padding: 6 },
  vtLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  vtVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  alicuotaBox: { flexDirection: 'row', justifyContent: 'space-between', padding: 5, backgroundColor: '#F8FAFC' },
  alicTxt: { fontSize: 7, color: GRAY },
  alicVal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY },
  
  /* NOTA LEGAL */
  nota: { marginTop: 10, padding: 8, backgroundColor: SOFT, borderLeft: `2pt solid ${NAVY}` },
  notaTxt: { fontSize: 6.5, color: GRAY, textAlign: 'justify', lineHeight: 1.5 },
  
  /* FIRMA (SOLO DIRECTOR) */
  firmaContainer: { marginTop: 45, alignItems: 'center' },
  firmaLine: { width: 220, borderBottom: `1pt solid ${INK}`, marginBottom: 6 },
  firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK },
  firmaCargo: { fontSize: 7, color: GRAY, marginTop: 2, fontFamily: 'Helvetica-Bold' },
  firmaInst: { fontSize: 6, color: GRAY, marginTop: 1 },
  
  /* PIE DE PÁGINA */
  footer: { position: 'absolute', bottom: 20, left: 25, right: 25, borderTop: `1pt solid ${NAVY}`, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  fTxt: { fontSize: 6, color: GRAY, lineHeight: 1.5 },
  fBold: { fontFamily: 'Helvetica-Bold', color: NAVY },
  fPage: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: NAVY },
});

const C = ({ label, value, style = s.cell }: any) => (
  <View style={style}>
    <Text style={s.lbl}>{label}</Text>
    <Text style={s.val}>{value === null || value === undefined || value === '' ? 'S/D' : String(value)}</Text>
  </View>
);

export default function FichaPDF({ inmueble, parametros, firmantes, logoUrl, qrDataUrl }: any) {
  const prop = inmueble.propietarios?.[0] || { nombre: 'NO REGISTRADO', apellido: '', cedula: 'N/D', telefono: '', email: '', tipo_tenencia: '', porcentaje_propiedad: 100 };
  const construcciones: any[] = inmueble.construcciones || [];
  
  const m2Terreno = inmueble.superficie_m2 || 0;
  const totalConstM2 = construcciones.reduce((sum, c) => sum + (c.area_construida_m2 || 0), 0);
  
  const valTerrenoM2 = parametros?.valor_m2_terreno ?? 24500;
  const valConstM2   = parametros?.valor_m2_construccion ?? 85400;
  const alicuota     = parametros?.alicuota_impuesto ?? 0.003;
  
  const valorTerreno  = m2Terreno * valTerrenoM2;
  const valorConstr   = totalConstM2 * valConstM2;
  const valorTotal    = valorTerreno + valorConstr;
  const baseImponible = valorTotal * alicuota;
  
  const hoy = new Date();
  const vence = new Date(hoy.getFullYear() + 3, hoy.getMonth(), hoy.getDate());
  const codigo = inmueble.codigo_catastral || 'S/D';
  const exp = `EXP-${hoy.getFullYear()}-${String(codigo).split('-').pop() || '000'}`;
  const verif = makeVerif(`${codigo}|${exp}|${hoy.getTime()}`);
  
  const nombreFull = `${prop.nombre || ''} ${prop.apellido || ''}`.trim() || 'NO REGISTRADO';
  const condicion  = `${(prop.tipo_tenencia || 'PROPIETARIO').replace(/_/g, ' ').toUpperCase()} · ${prop.porcentaje_propiedad ?? 100}%`;
  
  return (
    <Document title={`Cedula_Catastral_${codigo}`} author="Alcaldía del Municipio Torbes">
      <Page size={OFICIO} style={s.page}>
        <View style={s.frameOuter}>
          <View style={s.frameInner}>
            
            {/* ENCABEZADO CON QR ARRIBA A LA DERECHA */}
            <View style={s.header}>
              <View style={s.logoBox}>
                {logoUrl ? <Image src={logoUrl} style={s.qrImg} /> : <View style={s.logoPlaceholder} />}
              </View>
              <View style={s.headerText}>
                <Text style={s.rep}>REPÚBLICA BOLIVARIANA DE VENEZUELA</Text>
                <Text style={s.est}>ESTADO TÁCHIRA — MUNICIPIO TORBES</Text>
                <Text style={s.est}>ALCALDÍA DEL MUNICIPIO TORBES</Text>
                <Text style={s.dir}>DIRECCIÓN DE CATASTRO Y CONTROL URBANO</Text>
              </View>
              <View style={s.qrBox}>
                {qrDataUrl && <Image src={qrDataUrl} style={s.qrImg} />}
              </View>
            </View>

            {/* TÍTULO */}
            <View style={s.titleContainer}>
              <View style={s.titleBox}><Text style={s.title}>CÉDULA CATASTRAL</Text></View>
              <Text style={s.subtitle}>DOCUMENTO TÉCNICO-FISCAL · LEY DE GEOGRAFÍA Y CATASTRO NACIONAL</Text>
            </View>

            {/* DATOS DEL EXPEDIENTE */}
            <View style={s.section}>
              <View style={s.rowLast}>
                <View style={s.cell2x}>
                  <Text style={s.lbl}>CÓDIGO CATASTRAL</Text>
                  <Text style={s.valCode}>{codigo}</Text>
                </View>
                <C label="N° EXPEDIENTE ADMINISTRATIVO" value={exp} />
                <C label="FECHA DE EMISIÓN" value={dShort(hoy)} />
                <C label="VIGENTE HASTA" value={dShort(vence)} style={s.cellLast} />
              </View>
            </View>

            {/* 1. CONTRIBUYENTE */}
            <View style={s.section}>
              <View style={s.secHeader}><Text style={s.secTitle}>1. IDENTIFICACIÓN DEL PROPIETARIO O CONTRIBUYENTE</Text></View>
              <View style={s.row}>
                <C label="NOMBRE / RAZÓN SOCIAL" value={nombreFull} style={s.cell2x} />
                <C label="C.I. / R.I.F." value={prop.cedula} style={s.cellLast} />
              </View>
              <View style={s.rowLast}>
                <C label="CONDICIÓN JURÍDICA Y PARTICIPACIÓN" value={condicion} style={s.cell2x} />
                <C label="TELÉFONO" value={prop.telefono} />
                <C label="CORREO" value={prop.email} style={s.cellLast} />
              </View>
            </View>

            {/* 2. INMUEBLE */}
            <View style={s.section}>
              <View style={s.secHeader}><Text style={s.secTitle}>2. CARACTERÍSTICAS Y UBICACIÓN DEL INMUEBLE</Text></View>
              <View style={s.row}>
                <C label="DESTINO / USO" value={(inmueble.tipo_inmueble || '').toUpperCase()} />
                <C label="SECTOR / BARRIO" value={inmueble.barrio} />
                <C label="ZONA CATASTRAL" value={inmueble.zona} style={s.cellLast} />
              </View>
              <View style={s.row}>
                <C label="DIRECCIÓN COMPLETA (AVENIDA / CALLE)" value={inmueble.direccion} style={s.cellLast} />
              </View>
              <View style={s.row}>
                <C label="LINDERO NORTE" value={inmueble.norte} />
                <C label="LINDERO SUR" value={inmueble.sur} style={s.cellLast} />
              </View>
              <View style={s.rowLast}>
                <C label="LINDERO ESTE" value={inmueble.este} />
                <C label="LINDERO OESTE" value={inmueble.oeste} style={s.cellLast} />
              </View>
            </View>

            {/* 3. AVALÚO */}
            <View style={s.section}>
              <View style={s.secHeader}><Text style={s.secTitle}>3. VALORACIÓN CATASTRAL Y BASE IMPONIBLE</Text></View>
              <View style={s.vRowH}>
                <Text style={[s.vh, { flex: 2 }]}>CONCEPTO</Text>
                <Text style={[s.vh, { flex: 1, textAlign: 'right' }]}>ÁREA TOTAL</Text>
                <Text style={[s.vh, { flex: 1, textAlign: 'right' }]}>VALOR UNITARIO</Text>
                <Text style={[s.vh, { flex: 1.5, textAlign: 'right' }]}>VALOR TOTAL APROBADO</Text>
              </View>
              <View style={s.vRow}>
                <Text style={[s.vc, { flex: 2 }]}>ÁREA DE TERRENO</Text>
                <Text style={[s.vc, { flex: 1, textAlign: 'right' }]}>{money(m2Terreno)} m²</Text>
                <Text style={[s.vc, { flex: 1, textAlign: 'right' }]}>Bs. {money(valTerrenoM2)}</Text>
                <Text style={[s.vc, { flex: 1.5, textAlign: 'right' }]}>Bs. {money(valorTerreno)}</Text>
              </View>
              <View style={s.vRow}>
                <Text style={[s.vc, { flex: 2 }]}>ÁREA DE CONSTRUCCIONES</Text>
                <Text style={[s.vc, { flex: 1, textAlign: 'right' }]}>{money(totalConstM2)} m²</Text>
                <Text style={[s.vc, { flex: 1, textAlign: 'right' }]}>Bs. {money(valConstM2)}</Text>
                <Text style={[s.vc, { flex: 1.5, textAlign: 'right' }]}>Bs. {money(valorConstr)}</Text>
              </View>
              <View style={s.vTotalBox}>
                <Text style={[s.vtLabel, { flex: 4 }]}>VALOR CATASTRAL TOTAL DEL INMUEBLE</Text>
                <Text style={[s.vtVal, { flex: 1.5, textAlign: 'right' }]}>Bs. {money(valorTotal)}</Text>
              </View>
              <View style={s.alicuotaBox}>
                <Text style={s.alicTxt}>ALÍCUOTA APLICABLE AL EJERCICIO: {(alicuota * 100).toFixed(2)}%</Text>
                <Text style={s.alicVal}>BASE IMPONIBLE ANUAL: Bs. {money(baseImponible)}</Text>
              </View>
            </View>

            {/* NOTA LEGAL */}
            <View style={s.nota}>
              <Text style={s.notaTxt}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: NAVY }}>FUNDAMENTO LEGAL: </Text>
                La presente Cédula Catastral se expide con carácter estrictamente técnico y fiscal según los artículos correspondientes de la Ley de Geografía, Cartografía y Catastro Nacional. Este documento no constituye título de propiedad, ni subsana los vicios que pudieran afectar el derecho de posesión o propiedad del inmueble descrito. Toda modificación de las características físicas, jurídicas o económicas debe ser notificada a esta Dirección.
              </Text>
            </View>

            {/* FIRMA ÚNICA */}
            <View style={s.firmaContainer}>
              <View style={s.firmaLine} />
              <Text style={s.firmaNombre}>{firmantes?.director || 'Director(a) de Catastro'}</Text>
              <Text style={s.firmaCargo}>DIRECTOR(A) DE CATASTRO Y CONTROL URBANO</Text>
              <Text style={s.firmaInst}>ALCALDÍA DEL MUNICIPIO TORBES</Text>
            </View>

            {/* FOOTER */}
            <View style={s.footer} fixed>
              <View>
                <Text style={s.fTxt}>CÓDIGO VERIFICACIÓN: <Text style={s.fBold}>{verif}</Text></Text>
                <Text style={s.fTxt}>VALIDACIÓN WEB: catastro.torbes.gob.ve</Text>
              </View>
              <Text style={s.fPage} render={({ pageNumber }) => `PÁGINA ${pageNumber}`} />
            </View>
            
          </View>
        </View>
      </Page>
    </Document>
  );
}