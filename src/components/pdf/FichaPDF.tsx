import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Estilos del documento catastral
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 30,
    lineHeight: 1.3,
    color: '#1a1a1a',
  },
  // Encabezado
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#003366',
    paddingBottom: 8,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'column',
    width: '70%',
  },
  headerRight: {
    width: '25%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleRep: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4a4a4a',
  },
  titleAlcaldia: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 2,
  },
  titleDoc: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  qrMock: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    fontSize: 7,
    color: '#888',
    textAlign: 'center',
  },
  // Bloques de sección
  sectionTitle: {
    backgroundColor: '#f0f4f8',
    color: '#003366',
    fontSize: 9,
    fontWeight: 'bold',
    padding: 4,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
    borderLeftWidth: 3,
    borderLeftColor: '#003366',
  },
  // Estructura de filas y columnas (Flexbox)
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col: {
    flexDirection: 'column',
    flexGrow: 1,
  },
  col50: { width: '50%' },
  col33: { width: '33.33%' },
  col25: { width: '25%' },
  
  // Etiquetas y valores
  label: {
    fontSize: 8,
    color: '#555555',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 9,
    color: '#000000',
    marginTop: 1,
  },
  valueCode: {
    fontSize: 11,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  // Firmas
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    textAlign: 'center',
  },
  signatureBox: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 7,
    color: '#666',
    textAlign: 'justify',
    marginTop: 25,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 5,
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
    : { nombre: 'NO REGISTRADO', apellido: '', cedula: 'N/A' };

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
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.titleRep}>REPÚBLICA BOLIVARIANA DE VENEZUELA</Text>
            <Text style={styles.titleAlcaldia}>ALCALDÍA DEL MUNICIPIO TORBES - DIRECCIÓN DE CATASTRO</Text>
            <Text style={styles.titleDoc}>Cédula Catastral</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.qrMock}>
              <Text style={styles.qrText}>QR CÓDIGO</Text>
              <Text style={{ fontSize: 6, marginTop: 2 }}>{inmueble.codigo_catastral}</Text>
            </View>
          </View>
        </View>

        {/* IDENTIFICACIÓN DEL DOCUMENTO */}
        <View style={styles.row}>
          <View style={[styles.col, styles.col50]}>
            <Text style={styles.label}>Código Catastral Nacional</Text>
            <Text style={styles.valueCode}>{inmueble.codigo_catastral}</Text>
          </View>
          <View style={[styles.col, styles.col25]}>
            <Text style={styles.label}>N° Expediente</Text>
            <Text style={styles.value}>EXP-{new Date().getFullYear()}-{inmueble.codigo_catastral.split('-').pop()}</Text>
          </View>
          <View style={[styles.col, styles.col25]}>
            <Text style={styles.label}>Fecha de Emisión</Text>
            <Text style={styles.value}>{new Date().toLocaleDateString('es-VE')}</Text>
          </View>
        </View>

        {/* DATOS DEL PROPIETARIO */}
        <Text style={styles.sectionTitle}>1. Datos del Propietario o Contribuyente</Text>
        <View style={styles.row}>
          <View style={[styles.col, styles.col50]}>
            <Text style={styles.label}>Nombre completo / Razón Social</Text>
            <Text style={styles.value}>{`${propietario.nombre} ${propietario.apellido}`}</Text>
          </View>
          <View style={[styles.col, styles.col50]}>
            <Text style={styles.label}>Cédula de Identidad / R.I.F.</Text>
            <Text style={styles.value}>{propietario.cedula}</Text>
          </View>
        </View>

        {/* DATOS FÍSICOS DEL INMUEBLE */}
        <Text style={styles.sectionTitle}>2. Especificaciones Técnicas y Ubicación</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Dirección del Inmueble</Text>
            <Text style={styles.value}>{inmueble.direccion}, Barrio {inmueble.barrio || 'N/A'}, Zona {inmueble.zona || 'N/A'}</Text>
          </View>
        </View>
        <View style={[styles.row, { marginTop: 6 }]}>
          <View style={[styles.col, styles.col33]}>
            <Text style={styles.label}>Área Terreno (m²)</Text>
            <Text style={styles.value}>{formatCurrency(m2_terreno)}</Text>
          </View>
          <View style={[styles.col, styles.col33]}>
            <Text style={styles.label}>Área Construcción (m²)</Text>
            <Text style={styles.value}>{formatCurrency(totalConstruccionM2)}</Text>
          </View>
          <View style={[styles.col, styles.col33]}>
            <Text style={styles.label}>Destino / Uso</Text>
            <Text style={styles.value}>{inmueble.tipo_inmueble.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={[styles.row, { marginTop: 6 }]}>
          <View style={styles.col}>
            <Text style={styles.label}>Linderos</Text>
            <Text style={styles.value}>NORTE: {inmueble.norte || 'S/D'}; SUR: {inmueble.sur || 'S/D'}; ESTE: {inmueble.este || 'S/D'}; OESTE: {inmueble.oeste || 'S/D'}</Text>
          </View>
        </View>

        {/* INFORMACIÓN JURÍDICA */}
        <Text style={styles.sectionTitle}>3. Datos de Protocolización (Registro)</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Título de Propiedad según Registro Inmobiliario</Text>
            <Text style={styles.value}>Registro Público (Datos en actualización por el Contribuyente)</Text>
          </View>
        </View>

        {/* VALORACIÓN ECONÓMICA (CÁLCULO DERECHO DE FRENTE) */}
        <Text style={styles.sectionTitle}>4. Avalúo Catastral y Datos Económicos</Text>
        <View style={styles.row}>
          <View style={[styles.col, styles.col25]}>
            <Text style={styles.label}>Valor Terreno</Text>
            <Text style={styles.value}>Bs. {formatCurrency(totalValorTerreno)}</Text>
          </View>
          <View style={[styles.col, styles.col25]}>
            <Text style={styles.label}>Valor Bienhechuría</Text>
            <Text style={styles.value}>Bs. {formatCurrency(totalValorConstruccion)}</Text>
          </View>
          <View style={[styles.col, styles.col25]}>
            <Text style={styles.label}>Valor Catastral Total</Text>
            <Text style={styles.value}>Bs. {formatCurrency(valorCatastralTotal)}</Text>
          </View>
          <View style={[styles.col, styles.col25]}>
            <Text style={styles.label}>Impuesto Anual ({(alicuota * 100).toFixed(1)}%)</Text>
            <Text style={[styles.value, { fontWeight: 'bold', color: '#003366' }]}>Bs. {formatCurrency(baseImponible)}</Text>
          </View>
        </View>

        {/* FIRMAS DE VALIDACIÓN */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBox}>
            <Text style={styles.label}>Procesado Por</Text>
            <Text style={[styles.value, { marginTop: 15 }]}>Analista de Catastro</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.label}>Autorizado Por</Text>
            <Text style={[styles.value, { marginTop: 15 }]}>Director de Catastro (E)</Text>
          </View>
        </View>

        {/* NOTA LEGAL */}
        <Text style={styles.legalText}>
          La presente Cédula Catastral se emite de conformidad con la Ley de Geografía, Cartografía y Catastro Nacional. 
          Este documento tiene carácter estrictamente impositivo y técnico; no convalida títulos de propiedad defectuosos 
          ni suple los derechos legítimos de terceros. Válido únicamente para trámites ante la administración tributaria municipal.
        </Text>

      </Page>
    </Document>
  );
}
