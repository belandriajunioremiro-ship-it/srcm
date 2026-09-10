import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Estilos del documento catastral - Diseño Minimalista y Profesional (Tipo Grid)
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 40, // Más padding para que respire
    lineHeight: 1.3,
    color: '#000',
  },
  // Centered Header
  headerCenter: {
    alignItems: 'center',
    marginBottom: 15,
  },
  headerText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#000',
    lineHeight: 1.2,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#000',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  // Grid System
  grid: {
    borderWidth: 1.5,
    borderColor: '#003366',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#003366',
  },
  lastRow: {
    flexDirection: 'row',
  },
  sectionHeader: {
    backgroundColor: '#003366',
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#003366',
    textTransform: 'uppercase',
  },
  cell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#003366',
  },
  cellLast: {
    flex: 1,
    padding: 6,
  },
  cellLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  cellValue: {
    fontSize: 9,
    color: '#111',
  },
  cellRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Signatures
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  signatureBlock: {
    alignItems: 'center',
    width: '40%',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 6,
  },
  note: {
    fontSize: 7,
    textAlign: 'justify',
    marginTop: 15,
    lineHeight: 1.4,
  }
});

// Helper de formato de moneda
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

export default function FichaPDF({ inmueble, parametros }: { inmueble: any, parametros?: any }) {
  // Propietario principal (si existe)
  const propietario = inmueble.propietarios && inmueble.propietarios.length > 0 
    ? inmueble.propietarios[0]
    : { nombre: 'NO REGISTRADO', apellido: '', cedula: 'N/A', telefono: '', email: '', porcentaje_propiedad: 100, tipo_tenencia: '' };

  // Cálculos de Construcción
  const totalConstruccionM2 = inmueble.construcciones?.reduce((sum: number, c: any) => sum + c.area_construida_m2, 0) || 0;
  
  // Parámetros de valoración (Usamos valores por defecto si no existen)
  const val_terreno_m2 = parametros?.valor_m2_terreno || 24500.00;
  const val_const_m2 = parametros?.valor_m2_construccion || 85400.00;
  const alicuota = parametros?.alicuota_impuesto || 0.003;

  const m2_terreno = inmueble.superficie_m2 || 0;
  
  const totalValorTerreno = m2_terreno * val_terreno_m2;
  const totalValorConstruccion = totalConstruccionM2 * val_const_m2;
  const valorCatastralTotal = totalValorTerreno + totalValorConstruccion;
  const baseImponible = valorCatastralTotal * alicuota;

  return (
    <Document title={`Cedula_Catastral_${inmueble.codigo_catastral}`}>
      <Page size="LETTER" style={styles.page}>
        
        {/* ENCABEZADO OFICIAL */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerText}>REPÚBLICA BOLIVARIANA DE VENEZUELA</Text>
          <Text style={styles.headerText}>ESTADO TÁCHIRA / MUNICIPIO TORBES</Text>
          <Text style={styles.headerText}>ALCALDÍA DEL MUNICIPIO TORBES</Text>
          <Text style={styles.headerText}>DIRECCIÓN DE CATASTRO Y CONTROL URBANO</Text>
          <Text style={styles.headerTitle}>CÉDULA CATASTRAL</Text>
        </View>

        {/* TOP GRID (INFO DOCUMENTO) */}
        <View style={styles.grid}>
          <View style={styles.row}>
            <View style={[styles.cell, { flex: 2 }]}>
              <View style={styles.cellRowHorizontal}>
                <Text style={styles.cellLabel}>CÓDIGO CATASTRAL NUEVO (ISO): </Text>
                <Text style={[styles.cellValue, { marginLeft: 5 }]}>{inmueble.codigo_catastral}</Text>
              </View>
            </View>
            <View style={styles.cellLast}>
              <View style={styles.cellRowHorizontal}>
                <Text style={styles.cellLabel}>N° EXPEDIENTE: </Text>
                <Text style={[styles.cellValue, { marginLeft: 5 }]}>EXP-{new Date().getFullYear()}-{inmueble.codigo_catastral.split('-').pop()}</Text>
              </View>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={[styles.cell, { flex: 2 }]}>
              <View style={styles.cellRowHorizontal}>
                <Text style={styles.cellLabel}>FECHA DE EMISIÓN: </Text>
                <Text style={[styles.cellValue, { marginLeft: 5 }]}>{new Date().toLocaleDateString('es-VE')}</Text>
              </View>
            </View>
            <View style={styles.cellLast}>
              <View style={styles.cellRowHorizontal}>
                <Text style={styles.cellLabel}>FECHA DE VENCIMIENTO: </Text>
                <Text style={[styles.cellValue, { marginLeft: 5 }]}>{new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toLocaleDateString('es-VE')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 1: PROPIETARIO */}
        <View style={styles.grid}>
          <Text style={styles.sectionHeader}>1. DATOS DEL PROPIETARIO O CONTRIBUYENTE</Text>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Nombre / Razón Social:</Text>
              <Text style={styles.cellValue}>{`${propietario.nombre} ${propietario.apellido}`.trim()}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>C.I. / R.I.F.:</Text>
              <Text style={styles.cellValue}>{propietario.cedula}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Teléfono:</Text>
              <Text style={styles.cellValue}>{propietario.telefono || 'No registrado'}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Correo Electrónico:</Text>
              <Text style={styles.cellValue}>{propietario.email || 'No registrado'}</Text>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Porcentaje de Propiedad:</Text>
              <Text style={styles.cellValue}>{propietario.porcentaje_propiedad ? `${propietario.porcentaje_propiedad} %` : '100 %'}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Condición jurídica:</Text>
              <Text style={styles.cellValue}>{propietario.tipo_tenencia ? propietario.tipo_tenencia.replace('_', ' ').toUpperCase() : 'PROPIETARIO ÚNICO'}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: INMUEBLE */}
        <View style={styles.grid}>
          <Text style={styles.sectionHeader}>2. UBICACIÓN Y DESCRIPCIÓN FÍSICA DEL INMUEBLE</Text>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Urbanización / Sector:</Text>
              <Text style={styles.cellValue}>{inmueble.barrio || 'S/D'}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Calle / Avenida / Dirección:</Text>
              <Text style={styles.cellValue}>{inmueble.direccion || 'S/D'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Destino / Uso actual:</Text>
              <Text style={styles.cellValue}>{inmueble.tipo_inmueble ? inmueble.tipo_inmueble.toUpperCase() : 'S/D'}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Zona Catastral:</Text>
              <Text style={styles.cellValue}>{inmueble.zona || 'S/D'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Área Terreno Común (m²):</Text>
              <Text style={styles.cellValue}>{formatCurrency(m2_terreno)} m²</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Área Construcción Privativa (m²):</Text>
              <Text style={styles.cellValue}>{formatCurrency(totalConstruccionM2)} m²</Text>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Linderos Generales:</Text>
              <Text style={styles.cellValue}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>NORTE: </Text>{inmueble.norte || 'S/D'}; 
                <Text style={{ fontFamily: 'Helvetica-Bold' }}> SUR: </Text>{inmueble.sur || 'S/D'}; 
                <Text style={{ fontFamily: 'Helvetica-Bold' }}> ESTE: </Text>{inmueble.este || 'S/D'}; 
                <Text style={{ fontFamily: 'Helvetica-Bold' }}> OESTE: </Text>{inmueble.oeste || 'S/D'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: REGISTRO */}
        <View style={styles.grid}>
          <Text style={styles.sectionHeader}>3. INFORMACIÓN JURÍDICA (DATOS DE REGISTRO)</Text>
          <View style={styles.row}>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text style={styles.cellLabel}>Oficina de Registro:</Text>
              <Text style={styles.cellValue}>Registro Público (En actualización por el contribuyente)</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Tomo / Volumen:</Text>
              <Text style={styles.cellValue}>S/D</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text style={styles.cellLabel}>Número de Documento:</Text>
              <Text style={styles.cellValue}>S/D</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Protocolo / Trimestre:</Text>
              <Text style={styles.cellValue}>S/D</Text>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text style={styles.cellLabel}>Fecha de Registro:</Text>
              <Text style={styles.cellValue}>S/D</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Año del Registro:</Text>
              <Text style={styles.cellValue}>S/D</Text>
            </View>
          </View>
        </View>

        {/* SECTION 4: AVALÚO */}
        <View style={styles.grid}>
          <Text style={styles.sectionHeader}>4. VALORACIÓN CATASTRAL E IMPUESTOS</Text>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Valor del Terreno (Bs.):</Text>
              <Text style={styles.cellValue}>{formatCurrency(totalValorTerreno)}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Valor de Construcción (Bs.):</Text>
              <Text style={styles.cellValue}>{formatCurrency(totalValorConstruccion)}</Text>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>VALOR CATASTRAL TOTAL (Bs.):</Text>
              <Text style={styles.cellValue}>{formatCurrency(valorCatastralTotal)}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellLabel}>Base Imponible Anual (Bs.):</Text>
              <Text style={styles.cellValue}>{formatCurrency(baseImponible)}</Text>
            </View>
          </View>
        </View>

        {/* NOTA */}
        <Text style={styles.note}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>NOTA:</Text> La presente Cédula Catastral tiene un carácter estrictamente técnico y fiscal de conformidad con la Ley de Geografía, Cartografía y Catastro Nacional.
          No constituye título de propiedad ni subsana los vicios inherentes que puedan afectar el derecho de posesión o propiedad del inmueble. El contribuyente
          queda obligado a notificar a la Dirección de Catastro cualquier modificación que afecte las características físicas, jurídicas o económicas del inmueble dentro
          de los treinta (30) días posteriores a su ocurrencia.
        </Text>

        {/* FIRMAS */}
        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>Analista de Catastro</Text>
            <Text style={{ fontSize: 9, marginTop: 2 }}>Dirección de Catastro</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>Director(a) de Catastro</Text>
            <Text style={{ fontSize: 9, marginTop: 2 }}>Firma y Sello Oficial</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
