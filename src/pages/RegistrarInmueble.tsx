import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, MapPin, User as UserIcon, FileText, Check, LocateFixed, Crosshair, Navigation, Ruler, Compass, MapPinned, Hash, Building2, Map, Phone, Mail, IdCard, Users, Plus, Trash2, Camera, Upload, Home, Layers, Calendar, Wrench, Wand2 } from 'lucide-react'
import { useNotifications } from 'reapop'
import DibujarPoligono from '@/components/map/DibujarPoligono'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useOnlineStatus } from '@/hooks/useOnline'
import { useGeolocation } from '@/hooks/useGeolocation'
import { superficieM2Preview, perimetroMPreview, calcularLinderos, formatCoord, formatDMS, getVertices, resumenVertices } from '@/lib/geo'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

const propietarioSchema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
  nombre: z.string().min(1, 'Nombre requerido'),
  apellido: z.string().min(1, 'Apellido requerido'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  direccion_propietario: z.string().optional(),
  porcentaje: z.number().min(1, 'Mínimo 1%').max(100, 'Máximo 100%'),
  documento_soporte: z.string().optional()
})

const construccionSchema = z.object({
  tipo_construccion: z.enum(['vivienda','comercio','galpon','oficina','otro']),
  area_construida_m2: z.number().min(1, 'Área mínima 1 m²'),
  niveles: z.number().min(1, 'Mínimo 1 nivel'),
  anio_construccion: z.number().optional().or(z.literal('')),
  material_predominante: z.enum(['concreto','bloque','madera','mixto','otro']).optional().or(z.literal('')),
  estado_construccion: z.enum(['bueno','regular','malo','en_construccion'])
})

const schema = z.object({
  codigo_catastral: z.string().min(1, 'Código requerido'),
  direccion: z.string().min(1, 'Dirección requerida'),
  barrio: z.string().optional(),
  zona: z.string().optional(),
  tipo_inmueble: z.enum(['residencial', 'comercial', 'industrial', 'rural', 'mixto']),
  superficie_m2: z.number().min(1, 'Superficie requerida'),
  norte: z.string().optional(),
  sur: z.string().optional(),
  este: z.string().optional(),
  oeste: z.string().optional(),
  propietarios: z.array(propietarioSchema).min(1, 'Debe haber al menos un propietario'),
  construcciones: z.array(construccionSchema).optional()
}).refine(data => {
  const sum = data.propietarios.reduce((acc, p) => acc + (p.porcentaje || 0), 0)
  return sum === 100
}, {
  message: 'La suma de los porcentajes de copropiedad debe ser exactamente 100%',
  path: ['propietarios']
})

type FormData = z.infer<typeof schema>

export default function RegistrarInmueble() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const geo = useGeolocation()
  const { notify } = useNotifications()
  const [geom, setGeom] = useState<GeoJSON.Polygon | null>(null)
  const [saving, setSaving] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([7.6591, -72.2216])
  const [autoLinderos, setAutoLinderos] = useState(true)
  const [showCoordPanel, setShowCoordPanel] = useState(true)
  const [fotosFiles, setFotosFiles] = useState<File[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, control, handleSubmit, formState: { errors }, reset, setValue, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { 
      tipo_inmueble: 'residencial',
      propietarios: [{ cedula: '', nombre: '', apellido: '', porcentaje: 100 }],
      construcciones: []
    },
  })

  const { fields: propFields, append: propAppend, remove: propRemove } = useFieldArray({
    control, name: 'propietarios'
  })

  const { fields: consFields, append: consAppend, remove: consRemove } = useFieldArray({
    control, name: 'construcciones'
  })

  const handleGenerarCodigo = async () => {
    try {
      // Usamos el código de Estado (20 para Táchira) y Municipio (29 para Torbes)
      // para generar un código catastral estandarizado y profesional,
      // evitando que el texto ingresado por el usuario (ej. "Norte") corrompa el formato.
      const nuevoCodigo = await api.generarCodigoCatastral('20', '29')
      setValue('codigo_catastral', nuevoCodigo, { shouldValidate: true })
      notify(`Código generado: ${nuevoCodigo}`, 'success')
    } catch (err: any) {
      notify('Error al generar código: ' + err.message, 'error')
    }
  }

  useEffect(() => {
    if (geo.position) setMapCenter(geo.position)
  }, [geo.position])

  // Mostrar errores de GPS con notificaciones
  useEffect(() => {
    if (geo.error) {
      notify(geo.error, 'error')
    }
  }, [geo.error, notify])

  useEffect(() => {
    if (geom && geom.coordinates.length > 0 && autoLinderos) {
      const linderos = calcularLinderos(geom)
      setValue('norte', linderos.norte)
      setValue('sur', linderos.sur)
      setValue('este', linderos.este)
      setValue('oeste', linderos.oeste)
      
      // Auto-completar la superficie declarada con el Área GIS
      const areaGis = superficieM2Preview(geom)
      setValue('superficie_m2', Number(areaGis.toFixed(2)), { shouldValidate: true })
    }
  }, [geom, autoLinderos, setValue])

  const handleGeo = () => geo.requestPosition()
  const handleWatch = () => geo.watching ? geo.stopWatching() : geo.startWatching()

  const handleFotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFotosFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFoto = (index: number) => {
    setFotosFiles(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: FormData) => {
    if (!geom || geom.coordinates.length === 0) {
      notify('Debe dibujar el polígono del predio en el mapa', 'error')
      return
    }
    setSaving(true)
    try {
      if (!online) throw new Error('Debe tener conexión a internet para registrar en Supabase.')

      // Subir fotos a Supabase Storage
      const fotosUrls: string[] = []
      if (fotosFiles.length > 0) {
        for (const file of fotosFiles) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage.from('inmuebles').upload(fileName, file)
          
          if (uploadError) {
             // Es posible que el bucket "inmuebles" no exista aún. Se informará.
             throw new Error(`Error al subir la foto (asegúrate de que exista el bucket "inmuebles"): ${uploadError.message}`)
          }
          const { data: publicData } = supabase.storage.from('inmuebles').getPublicUrl(fileName)
          fotosUrls.push(publicData.publicUrl)
        }
      }

      // 1. Crear o buscar propietarios
      const propsData = []
      for (const p of data.propietarios) {
        let propId = ''
        const { data: existing } = await supabase.from('propietarios').select('id').eq('cedula', p.cedula).maybeSingle()
        if (existing) {
          propId = existing.id
        } else {
          const nuevoPropietario = await api.createPropietario({
            cedula: p.cedula,
            nombre: p.nombre,
            apellido: p.apellido,
            telefono: p.telefono,
            email: p.email,
            direccion: p.direccion_propietario,
          })
          propId = nuevoPropietario.id
        }
        
        propsData.push({
          propietario_id: propId,
          porcentaje: p.porcentaje,
          tipo_tenencia: p.porcentaje === 100 ? 'pleno_dominio' : 'copropiedad',
          documento_soporte: p.documento_soporte
        })
      }

      // 2. Crear Inmueble y asociar todo
      await api.createInmueble(
        {
          codigo_catastral: data.codigo_catastral,
          direccion: data.direccion,
          barrio: data.barrio,
          zona: data.zona,
          tipo_inmueble: data.tipo_inmueble,
          superficie_m2: data.superficie_m2,
          norte: data.norte,
          sur: data.sur,
          este: data.este,
          oeste: data.oeste,
          geom,
        },
        propsData,
        fotosUrls,
        data.construcciones || []
      )

      setSaving(false)
      notify('Registro guardado exitosamente', 'success')
      reset()
      setGeom(null)
      setFotosFiles([])
      setTimeout(() => navigate('/mapa'), 1500)
    } catch (err: any) {
      setSaving(false)
      notify(err.message || 'Error al guardar el registro en la base de datos.', 'error')
    }
  }

  const onError = () => {
    notify('Por favor completa todos los campos obligatorios correctamente.', 'error')
    if (errors.propietarios?.root) {
      notify(errors.propietarios.root.message, 'error')
    }
  }

  const vertices = geom && geom.coordinates.length > 0 ? getVertices(geom) : []
  const resumen = geom && geom.coordinates.length > 0 ? resumenVertices(geom) : []

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg md:text-xl font-bold text-text-main">Registrar Inmueble</h1>
        <div className="flex items-center gap-2 hidden md:flex">
          {online ? (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> En línea
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
              <span className="w-2 h-2 bg-red-500 rounded-full" /> Sin conexión
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-institutional-slate mb-6">
        Complete los datos, polígono, construcciones y fotografías del predio.
      </p>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Columna Mapa */}
        <div className="md:col-span-12 lg:col-span-7">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Polígono del Predio</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleGeo} disabled={geo.loading} className="flex items-center gap-1.5 text-xs text-institutional-navy hover:bg-background-lighter px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                  <LocateFixed className={`w-3.5 h-3.5 ${geo.loading ? 'animate-spin' : ''}`} /> {geo.loading ? 'Buscando...' : 'Mi ubicación'}
                </button>
                <button type="button" onClick={handleWatch} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition ${geo.watching ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' : 'text-institutional-navy hover:bg-background-lighter border border-transparent'}`}>
                  <Crosshair className={`w-3.5 h-3.5 ${geo.watching ? 'animate-pulse' : ''}`} /> {geo.watching ? 'GPS activo' : 'Rastrear GPS'}
                </button>
              </div>
            </div>
            
            {geo.position && (
              <div className="mb-3 bg-background-light border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                <Navigation className="w-4 h-4 text-institutional-navy flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-institutional-slate">GPS:</span> <span className="font-mono font-semibold text-text-main">{formatCoord(geo.position[0], geo.position[1])}</span>
                  {geo.accuracy && <span className="text-institutional-slate ml-2 block md:inline">(precisión: ±{geo.accuracy.toFixed(0)}m)</span>}
                </div>
                <button type="button" onClick={() => setShowCoordPanel(!showCoordPanel)} className="text-institutional-navy font-medium hover:underline">
                  {showCoordPanel ? 'Ocultar' : 'Mostrar'} coords
                </button>
              </div>
            )}

            <div className="h-[400px] md:h-[500px]">
              <DibujarPoligono onPolygon={setGeom} center={mapCenter} userPosition={geo.position} />
            </div>

            {/* Paneles Informativos del Mapa */}
            {showCoordPanel && vertices.length > 0 && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-background-light rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2"><MapPinned className="w-3.5 h-3.5 text-institutional-navy" /><p className="text-xs font-semibold text-text-charcoal">Vértices</p></div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {vertices.map((v) => (
                      <p key={v.index} className="text-xs text-institutional-slate font-mono"><span className="font-semibold text-text-charcoal">V{v.index + 1}:</span> {formatDMS(v.lat, v.lon)}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-background-light rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2"><Compass className="w-3.5 h-3.5 text-institutional-navy" /><p className="text-xs font-semibold text-text-charcoal">Linderos (dist/rumbo)</p></div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {resumen.map((r) => (
                      <p key={r.index} className="text-xs text-institutional-slate font-mono"><span className="font-semibold text-text-charcoal">V{r.index + 1}→V{r.index + 2 > vertices.length ? 1 : r.index + 2}:</span> {r.distancia.toFixed(1)}m — {r.azimut.toFixed(0)}° {r.cardinal}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {geom && geom.coordinates.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 md:gap-3">
                <div className="bg-background-light border border-gray-100 rounded-lg px-2 py-2 text-center md:text-left"><p className="text-[10px] text-institutional-slate">Área GIS</p><p className="font-bold text-text-main text-xs">{superficieM2Preview(geom).toFixed(2)} m²</p></div>
                <div className="bg-background-light border border-gray-100 rounded-lg px-2 py-2 text-center md:text-left"><p className="text-[10px] text-institutional-slate">Perímetro GIS</p><p className="font-bold text-text-main text-xs">{perimetroMPreview(geom).toFixed(2)} m</p></div>
                <div className="bg-background-light border border-gray-100 rounded-lg px-2 py-2 text-center md:text-left"><p className="text-[10px] text-institutional-slate">Vértices</p><p className="font-bold text-text-main text-xs">{vertices.length}</p></div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Formulario */}
        <div className="md:col-span-12 lg:col-span-5 space-y-4">
          
          {/* Datos del predio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-institutional-navy" />
              <h2 className="text-sm font-semibold text-text-charcoal">Ficha del Terreno</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex gap-2">
                <div className="flex-1">
                  <Input label="Código Catastral *" icon={<Hash size={18} />} placeholder="TORBES-009" {...register('codigo_catastral')} />
                </div>
                <button type="button" onClick={handleGenerarCodigo} className="bg-institutional-slate/10 hover:bg-institutional-slate/20 text-institutional-navy px-4 rounded-lg flex items-center justify-center gap-2 transition" title="Autogenerar código">
                  <Wand2 size={18} />
                </button>
              </div>
              <div className="md:col-span-2">
                <Input label="Dirección *" icon={<MapPin size={18} />} placeholder="Av. Principal" {...register('direccion')} />
              </div>
              <div>
                <Input label="Barrio" icon={<Map size={18} />} placeholder="Centro" {...register('barrio')} />
              </div>
              <div>
                <Input label="Zona" icon={<MapPinned size={18} />} placeholder="Norte" {...register('zona')} />
              </div>
              <div>
                <Select
                  label="Tipo Inmueble *"
                  icon={<Building2 size={18} />}
                  {...register('tipo_inmueble')}
                  options={[
                    { label: 'Residencial', value: 'residencial' },
                    { label: 'Comercial', value: 'comercial' },
                    { label: 'Industrial', value: 'industrial' },
                    { label: 'Rural', value: 'rural' },
                    { label: 'Mixto', value: 'mixto' },
                  ]}
                />
              </div>
              <div>
                <Input label="Sup. Declarada (m²) *" type="number" step="0.01" icon={<Ruler size={18} />} placeholder="250" {...register('superficie_m2', { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          {/* Construcciones (Nuevo) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Construcciones</h2>
              </div>
              <button
                type="button"
                onClick={() => consAppend({ tipo_construccion: 'vivienda', area_construida_m2: 0, niveles: 1, anio_construccion: '', material_predominante: '', estado_construccion: 'bueno' })}
                className="flex items-center gap-1.5 text-xs text-institutional-navy font-semibold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition border border-transparent hover:border-blue-100"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir Construcción
              </button>
            </div>
            {consFields.length === 0 && (
              <p className="text-xs text-institutional-slate text-center py-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                Lote sin construcciones declaradas.
              </p>
            )}
            <div className="space-y-4">
              {consFields.map((field, index) => (
                <div key={field.id} className="p-4 bg-background-light border border-gray-200 rounded-xl relative">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-institutional-slate uppercase tracking-wider">
                      Edificación {index + 1}
                    </h3>
                    <button type="button" onClick={() => consRemove(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Tipo *"
                      icon={<Building2 size={18} />}
                      {...register(`construcciones.${index}.tipo_construccion`)}
                      options={[
                        { label: 'Vivienda', value: 'vivienda' },
                        { label: 'Comercio', value: 'comercio' },
                        { label: 'Galpón', value: 'galpon' },
                        { label: 'Oficina', value: 'oficina' },
                        { label: 'Otro', value: 'otro' }
                      ]}
                    />
                    <Input label="Área (m²) *" type="number" step="0.01" icon={<Ruler size={18} />} {...register(`construcciones.${index}.area_construida_m2`, { valueAsNumber: true })} />
                    <Input label="Niveles/Pisos *" type="number" icon={<Layers size={18} />} {...register(`construcciones.${index}.niveles`, { valueAsNumber: true })} />
                    <Input label="Año Const." type="number" icon={<Calendar size={18} />} {...register(`construcciones.${index}.anio_construccion`, { valueAsNumber: true })} />
                    <Select
                      label="Material"
                      icon={<Wrench size={18} />}
                      {...register(`construcciones.${index}.material_predominante`)}
                      options={[
                        { label: 'Concreto', value: 'concreto' },
                        { label: 'Bloque', value: 'bloque' },
                        { label: 'Madera', value: 'madera' },
                        { label: 'Mixto', value: 'mixto' },
                        { label: 'Otro', value: 'otro' }
                      ]}
                    />
                    <Select
                      label="Estado *"
                      icon={<Home size={18} />}
                      {...register(`construcciones.${index}.estado_construccion`)}
                      options={[
                        { label: 'Bueno', value: 'bueno' },
                        { label: 'Regular', value: 'regular' },
                        { label: 'Malo', value: 'malo' },
                        { label: 'En Construcción', value: 'en_construccion' }
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fotografías (Nuevo) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Fotografías</h2>
              </div>
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFotosChange} 
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 hover:border-institutional-navy hover:bg-blue-50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer text-institutional-slate"
            >
              <Upload className="w-8 h-8 mb-2 text-gray-400" />
              <p className="text-sm font-medium">Clic para subir fotos del predio</p>
              <p className="text-xs mt-1">Soporta múltiples imágenes</p>
            </div>

            {fotosFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-3">
                {fotosFiles.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden group">
                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => removeFoto(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linderos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Linderos</h2>
              </div>
              <label className="flex items-center gap-2 text-xs text-institutional-slate cursor-pointer">
                <input type="checkbox" checked={autoLinderos} onChange={(e) => setAutoLinderos(e.target.checked)} className="rounded text-institutional-navy focus:ring-institutional-navy" />
                Auto-calcular
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Textarea label="Norte" icon={<Compass size={18} />} placeholder="Calculado..." {...register('norte')} /></div>
              <div><Textarea label="Sur" icon={<Compass size={18} />} placeholder="Calculado..." {...register('sur')} /></div>
              <div><Textarea label="Este" icon={<Compass size={18} />} placeholder="Calculado..." {...register('este')} /></div>
              <div><Textarea label="Oeste" icon={<Compass size={18} />} placeholder="Calculado..." {...register('oeste')} /></div>
            </div>
          </div>

          {/* Propietarios / Copropiedad */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Copropiedad</h2>
              </div>
              <button
                type="button"
                onClick={() => propAppend({ cedula: '', nombre: '', apellido: '', porcentaje: 50 })}
                className="flex items-center gap-1.5 text-xs text-institutional-navy font-semibold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition border border-transparent hover:border-blue-100"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir Propietario
              </button>
            </div>

            <div className="space-y-4">
              {propFields.map((field, index) => (
                <div key={field.id} className="p-4 bg-background-light border border-gray-200 rounded-xl relative">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-institutional-slate uppercase tracking-wider">
                      Propietario {index + 1}
                    </h3>
                    {index > 0 && (
                      <button type="button" onClick={() => propRemove(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input label="Cédula *" icon={<IdCard size={18} />} placeholder="1101234567" {...register(`propietarios.${index}.cedula`)} />
                    </div>
                    <div>
                      <Input label="Porcentaje (%) *" type="number" step="0.01" icon={<FileText size={18} />} {...register(`propietarios.${index}.porcentaje`, { valueAsNumber: true })} />
                    </div>
                    <div>
                      <Input label="Nombre *" icon={<UserIcon size={18} />} placeholder="Nombre" {...register(`propietarios.${index}.nombre`)} />
                    </div>
                    <div>
                      <Input label="Apellido *" icon={<UserIcon size={18} />} placeholder="Apellido" {...register(`propietarios.${index}.apellido`)} />
                    </div>
                    <div>
                      <Input label="Teléfono" icon={<Phone size={18} />} placeholder="099..." {...register(`propietarios.${index}.telefono`)} />
                    </div>
                    <div>
                      <Input label="Email" type="email" icon={<Mail size={18} />} placeholder="correo@mail.com" {...register(`propietarios.${index}.email`)} />
                    </div>
                    <div className="md:col-span-2">
                      <Input label="Dirección del Propietario" icon={<MapPin size={18} />} placeholder="Av..." {...register(`propietarios.${index}.direccion_propietario`)} />
                    </div>
                    <div className="md:col-span-2">
                      <Input label="Documento Soporte (Escritura/Título)" icon={<FileText size={18} />} placeholder="Ej: Registro N° 12345 o URL del PDF" {...register(`propietarios.${index}.documento_soporte`)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-institutional-navy hover:bg-[#152c6b] text-white py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm mt-4 text-lg"
          >
            <Save className="w-5 h-5" /> {saving ? 'Subiendo al Servidor...' : 'Guardar Ficha Completa'}
          </button>
        </div>
      </form>
    </div>
  )
}
