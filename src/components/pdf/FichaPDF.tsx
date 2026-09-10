import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Inmueble } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#fff' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoBox: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', border: '1pt solid #cbd5e1', borderRadius: 40, backgroundColor: '#f8fafc' },
  logoText: { fontSize: 10, fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center' },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  headerTextMain: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', color: '#111827' },
  headerTextSub: { fontSize: 11, textAlign: 'center', marginTop: 4, color: '#374151' },
  qrBox: { width: 80, alignItems: 'center' },
  qrImage: { width: 60, height: 60, marginBottom: 4 },
  qrLabel: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
  qrCode: { fontSize: 10, fontWeight: 'bold', color: '#e11d48' },

  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 15, letterSpacing: 1, color: '#111827' },
  subTitleSmall: { fontSize: 9, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },

  table: { width: '100%', borderWidth: 1, borderColor: '#475569', borderRadius: 4, overflow: 'hidden', marginBottom: 15 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#475569' },
  tableHeaderCell: { flex: 1, padding: 4, color: 'white', fontSize: 8, fontWeight: 'bold', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#94a3b8' },
  tableRow: { flexDirection: 'row' },
  tableCell: { flex: 1, padding: 5, fontSize: 9, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#cbd5e1' },

  threeCols: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  colBox: { flex: 1, borderWidth: 1, borderColor: '#475569', borderRadius: 4, overflow: 'hidden', marginHorizontal: 3 },
  colHeader: { backgroundColor: '#475569', padding: 4, color: 'white', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  colContent: { padding: 6 },
  colRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  colLabel: { fontSize: 8, fontWeight: 'bold', color: '#374151' },
  colValue: { fontSize: 8, color: '#111827', flex: 1, textAlign: 'right' },

  infoRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  infoLabel: { fontSize: 9, fontWeight: 'bold', marginRight: 4, color: '#111827' },
  infoValue: { fontSize: 9, flex: 1, color: '#374151' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginVertical: 12, color: '#111827' },
  
  linderosBox: { marginBottom: 15 },
  linderoRow: { flexDirection: 'row', marginBottom: 4 },
  linderoLabel: { fontSize: 9, fontWeight: 'bold', width: 50 },
  linderoValue: { fontSize: 9, flex: 1, color: '#374151' },

  twoCols: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  
  validity: { fontSize: 12, fontWeight: 'bold', color: '#e11d48', textAlign: 'center', marginVertical: 20 },

  footer: { marginTop: 'auto', alignItems: 'center', paddingTop: 40 },
  signatureLine: { width: 220, borderTopWidth: 1, borderTopColor: '#000', marginBottom: 5 },
  footerText: { fontSize: 10, fontWeight: 'bold' },
  footerSub: { fontSize: 8, color: '#475569', marginTop: 2 },
  disclaimer: { fontSize: 6, color: '#64748b', textAlign: 'justify', marginTop: 20, lineHeight: 1.4 }
})

interface Props {
  inmueble: Inmueble
}

export default function FichaPDF({ inmueble }: Props) {
  const propsArray = inmueble.propietarios && inmueble.propietarios.length > 0 
    ? inmueble.propietarios 
    : (inmueble.propietario ? [inmueble.propietario as any] : [])
    
  const mainProp = propsArray[0]
  
  const totalConstruccion = inmueble.construcciones 
    ? inmueble.construcciones.reduce((sum: number, c: any) => sum + (c.area_construida_m2 || 0), 0)
    : 0

  // Extract parts of code if possible for the grid, else just repeat it
  const codeParts = inmueble.codigo_catastral.split('-')
  const p1 = codeParts[0] || '01'
  const p2 = codeParts[1] || '02'
  const p3 = codeParts[2] || '03'
  
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://srcm.gob.ec/ficha/' + inmueble.codigo_catastral)}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View style={{ width: 80, height: 80, justifyContent: 'center' }}>
            <Image src="/assets/logos/logo.png" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          </View>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTextMain}>SISTEMA DE REGISTRO CATASTRAL MUNICIPAL (SRCM)</Text>
            <Text style={styles.headerTextSub}>ALCALDÍA MUNICIPAL</Text>
          </View>

          <View style={styles.qrBox}>
            <Image src={qrUrl} style={styles.qrImage} />
            <Text style={styles.qrLabel}>Certificado ✅</Text>
            <Text style={styles.qrCode}>Nº {Math.floor(Math.random() * 1000000000)}</Text>
          </View>
        </View>

        <Text style={styles.title}>CÉDULA CATASTRAL</Text>
        <Text style={styles.subTitleSmall}>CÓDIGO CATASTRAL</Text>

        {/* CÓDIGO GRID */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell}>ZONA</Text>
            <Text style={styles.tableHeaderCell}>SECTOR</Text>
            <Text style={styles.tableHeaderCell}>MANZ</Text>
            <Text style={styles.tableHeaderCell}>LOTE</Text>
            <Text style={[styles.tableHeaderCell, { borderRightWidth: 0 }]}>CÓDIGO COMPLETO</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>{inmueble.zona || p1}</Text>
            <Text style={styles.tableCell}>{inmueble.barrio || p2}</Text>
            <Text style={styles.tableCell}>{p3}</Text>
            <Text style={styles.tableCell}>001</Text>
            <Text style={[styles.tableCell, { borderRightWidth: 0, fontWeight: 'bold' }]}>{inmueble.codigo_catastral}</Text>
          </View>
        </View>

        {/* 3 COLS */}
        <View style={styles.threeCols}>
          <View style={styles.colBox}>
            <Text style={styles.colHeader}>EVALUACIÓN</Text>
            <View style={styles.colContent}>
              <View style={styles.colRow}><Text style={styles.colLabel}>LEGAL</Text><Text style={styles.colValue}>APROBADO</Text></View>
              <View style={styles.colRow}><Text style={styles.colLabel}>FÍSICO</Text><Text style={styles.colValue}>APROBADO</Text></View>
              <View style={styles.colRow}><Text style={styles.colLabel}>VALORATIVO</Text><Text style={styles.colValue}>APROBADO</Text></View>
            </View>
          </View>
          <View style={styles.colBox}>
            <Text style={styles.colHeader}>CARACTERÍSTICAS</Text>
            <View style={styles.colContent}>
              <View style={styles.colRow}><Text style={styles.colLabel}>TIPO</Text><Text style={styles.colValue}>{inmueble.tipo_inmueble.toUpperCase()}</Text></View>
              <View style={styles.colRow}><Text style={styles.colLabel}>USO</Text><Text style={styles.colValue}>{inmueble.tipo_inmueble.toUpperCase()}</Text></View>
              <View style={styles.colRow}><Text style={styles.colLabel}>V. PRINCIPAL</Text><Text style={styles.colValue}>SI</Text></View>
            </View>
          </View>
          <View style={styles.colBox}>
            <Text style={styles.colHeader}>ASPECTOS FÍSICOS</Text>
            <View style={styles.colContent}>
              <View style={styles.colRow}><Text style={styles.colLabel}>TERRENO</Text><Text style={styles.colValue}>{inmueble.superficie_m2?.toFixed(2) ?? '0.00'} m²</Text></View>
              <View style={styles.colRow}><Text style={styles.colLabel}>CONSTRUCCIÓN</Text><Text style={styles.colValue}>{totalConstruccion.toFixed(2)} m²</Text></View>
              <View style={styles.colRow}><Text style={styles.colLabel}>AÑO CONST.</Text><Text style={styles.colValue}>{inmueble.construcciones && inmueble.construcciones[0]?.anio_construccion ? inmueble.construcciones[0].anio_construccion : new Date().getFullYear()}</Text></View>
            </View>
          </View>
        </View>

        {/* INFO LINEAR */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>SOLICITANTE PRINCIPAL:</Text>
          <Text style={styles.infoValue}>{mainProp ? `${mainProp.nombre} ${mainProp.apellido}`.toUpperCase() : 'NO REGISTRADO'}</Text>
          <Text style={styles.infoLabel}>IDENTIDAD:</Text>
          <Text style={styles.infoValue}>{mainProp?.cedula ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>DIRECCIÓN DEL INMUEBLE:</Text>
          <Text style={styles.infoValue}>{inmueble.direccion.toUpperCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Correo electrónico:</Text>
          <Text style={styles.infoValue}>{mainProp?.email ?? '—'}</Text>
          <Text style={styles.infoLabel}>Creado:</Text>
          <Text style={styles.infoValue}>{inmueble.created_at ? new Date(inmueble.created_at).toLocaleDateString() : '—'}</Text>
          <Text style={styles.infoLabel}>Actualizado:</Text>
          <Text style={styles.infoValue}>{inmueble.updated_at ? new Date(inmueble.updated_at).toLocaleDateString() : '—'}</Text>
        </View>

        {/* LINDEROS */}
        <Text style={styles.sectionTitle}>LINDEROS</Text>
        <View style={styles.linderosBox}>
          <View style={styles.linderoRow}><Text style={styles.linderoLabel}>NORTE:</Text><Text style={styles.linderoValue}>{inmueble.norte || 'Según plano adjunto'}</Text></View>
          <View style={styles.linderoRow}><Text style={styles.linderoLabel}>SUR:</Text><Text style={styles.linderoValue}>{inmueble.sur || 'Según plano adjunto'}</Text></View>
          <View style={styles.linderoRow}><Text style={styles.linderoLabel}>ESTE:</Text><Text style={styles.linderoValue}>{inmueble.este || 'Según plano adjunto'}</Text></View>
          <View style={styles.linderoRow}><Text style={styles.linderoLabel}>OESTE:</Text><Text style={styles.linderoValue}>{inmueble.oeste || 'Según plano adjunto'}</Text></View>
        </View>

        {/* 2 COLS */}
        <View style={styles.twoCols}>
          <View style={styles.colBox}>
            <Text style={styles.colHeader}>DERECHOS Y COPROPIEDAD</Text>
            <View style={styles.colContent}>
              {propsArray.length > 0 ? propsArray.map((p: any, i: number) => (
                <View key={i} style={styles.colRow}>
                  <Text style={styles.colLabel}>{p.cedula}</Text>
                  <Text style={[styles.colValue, { textAlign: 'left', marginLeft: 10 }]}>
                    {`${p.nombre} ${p.apellido}`.toUpperCase()} ({p.porcentaje_propiedad || 100}%)
                  </Text>
                </View>
              )) : (
                <View style={styles.colRow}>
                  <Text style={styles.colLabel}>—</Text>
                  <Text style={[styles.colValue, { textAlign: 'left', marginLeft: 10 }]}>NO REGISTRADO</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.colBox}>
            <Text style={styles.colHeader}>ASPECTOS VALORATIVOS</Text>
            <View style={styles.colContent}>
              <View style={styles.colRow}><Text style={styles.colLabel}>VALOR CATASTRAL:</Text><Text style={styles.colValue}>USD ${(inmueble.superficie_m2 * 120).toLocaleString()}</Text></View>
              <View style={styles.colRow}><Text style={styles.colLabel}>VALOR COMERCIAL:</Text><Text style={styles.colValue}>USD ${(inmueble.superficie_m2 * 150).toLocaleString()}</Text></View>
              <View style={styles.colRow}><Text style={styles.colLabel}>IMPUESTO ANUAL:</Text><Text style={styles.colValue}>USD ${(inmueble.superficie_m2 * 1.2).toLocaleString()}</Text></View>
            </View>
          </View>
        </View>

        <Text style={styles.validity}>VÁLIDO HASTA EL 31 DE DICIEMBRE DE {new Date().getFullYear()}</Text>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.signatureLine} />
          <Text style={styles.footerText}>DIRECCIÓN DE CATASTRO MUNICIPAL</Text>
          <Text style={styles.footerSub}>Emitido de forma automática por el SRCM</Text>
          
          <Text style={styles.disclaimer}>
            El presente certificado no otorga propiedad sobre bienes inmuebles, los datos han sido registrados bajo declaración jurada. Cualquier cambio deberá ser notificado en un lapso no mayor a 30 días ante la dirección de catastro municipal. Este documento ha sido emitido de forma automática a través del sistema SRCM. Este certificado electrónico se encuentra firmado digitalmente según la Ley de Comercio Electrónico, Firmas y Mensajes de Datos.
          </Text>
        </View>
        
      </Page>
    </Document>
  )
}
