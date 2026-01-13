# 🚀 Servidor de Administración - Velatron Comics

Backend en Python Flask para gestionar la subida de cómics al sitio web.

## ✨ Características

- ✅ **Límite de 21 imágenes** por cómic
- ✅ **Conversión automática a AVIF** - Acepta JPG, PNG, WEBP, GIF y los convierte
- ✅ **7 temporadas máximo** - Selector de temporada 1 a 7
- ✅ **Gestión automática de carpetas** - Crea estructura `comics/nombre-comic/temporadaX/`
- ✅ **Validación de archivos** - Solo acepta formatos de imagen válidos
- ✅ **Portada automática** - Se guarda como `portada.avif`
- ✅ **Numeración automática** - Las imágenes se numeran 1.avif, 2.avif, etc.

## 📋 Requisitos

- Python 3.8 o superior
- pip (gestor de paquetes de Python)

## 🔧 Instalación

### 1. Instalar Python

Si no tienes Python instalado:
- **Windows**: Descarga desde https://www.python.org/downloads/
- **Mac/Linux**: Generalmente ya viene instalado

### 2. Instalar dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
pip install -r requirements.txt
```

Esto instalará:
- Flask (servidor web)
- Flask-CORS (para permitir peticiones desde el navegador)
- Pillow (procesamiento de imágenes)
- pillow-avif-plugin (soporte para formato AVIF)

### 3. Iniciar el servidor

```bash
python server.py
```

Deberías ver algo como:

```
🚀 Servidor Velatron Comics iniciado
📁 Carpeta de cómics: D:\velatron4\Nueva carpeta\Velatron\commic\comics
📊 Máximo de imágenes: 21
🎨 Formato requerido: .avif
📺 Temporadas permitidas: temporada1, temporada2, temporada3, temporada4, temporada5, temporada6, temporada7

🌐 Servidor corriendo en http://localhost:5000
```

## 🎯 Uso

### Subir un cómic

1. **Inicia el servidor Python** (si no está corriendo):
   ```bash
   python server.py
   ```

2. **Abre el panel de administración** en tu navegador:
   ```
   http://localhost:8000/admin.html
   ```
   (o el puerto donde esté corriendo tu servidor web local)

3. **Completa el formulario**:
   - **Nombre del Cómic**: Título que aparecerá en la web
   - **Temporada**: Selecciona de la lista (temporada1 a temporada7)
   - **Imagen de Portada**: Selecciona la imagen principal (JPG, PNG, WEBP o AVIF)
   - **Archivo ZIP**: Crea un ZIP con tus imágenes del cómic (máximo 21)

4. **Haz clic en "Subir Cómic"**

### Formato del ZIP

El ZIP debe contener las imágenes del cómic:

```
mi-comic.zip
├── 01.jpg
├── 02.jpg
├── 03.jpg
├── ...
└── 21.jpg (máximo)
```

**Notas importantes:**
- ✅ Máximo 21 imágenes
- ✅ Formatos aceptados: JPG, JPEG, PNG, WEBP, GIF, AVIF
- ✅ Se convertirán automáticamente a AVIF
- ✅ Se renombrarán a 1.avif, 2.avif, 3.avif...
- ❌ No incluir subcarpetas
- ❌ No incluir archivos que no sean imágenes

## 📁 Estructura de carpetas generada

El servidor creará automáticamente:

```
comics/
└── nombre-del-comic/
    ├── temporada1/
    │   ├── portada.avif
    │   ├── 1.avif
    │   ├── 2.avif
    │   └── ...
    ├── temporada2/
    │   ├── portada.avif
    │   └── ...
    └── ...
```

## 🔌 Endpoints de la API

### `POST /upload`
Sube un nuevo cómic

**FormData:**
- `comicName` (string): Nombre del cómic
- `season` (string): temporada1-7
- `coverImage` (file): Imagen de portada
- `zipFile` (file): ZIP con las páginas del cómic

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "¡Cómic subido exitosamente! 15 imágenes procesadas",
  "data": {
    "comic_name": "Nacimiento de un Héroe",
    "folder": "nacimiento-de-un-heroe",
    "season": "temporada1",
    "path": "comics/nacimiento-de-un-heroe/temporada1",
    "images_count": 15
  }
}
```

### `GET /list-comics`
Lista todos los cómics disponibles

**Respuesta:**
```json
{
  "success": true,
  "comics": {
    "comic-1": {
      "temporada1": {
        "images_count": 15,
        "has_cover": true
      }
    }
  }
}
```

### `POST /delete-comic`
Elimina un cómic o temporada

**JSON:**
```json
{
  "comic_folder": "nombre-comic",
  "season": "temporada1"  // opcional, si se omite elimina todo el cómic
}
```

### `GET /health`
Verifica que el servidor esté funcionando

## ⚠️ Solución de problemas

### Error: "No module named 'flask'"
```bash
pip install -r requirements.txt
```

### Error: "Address already in use"
El puerto 5000 está ocupado. Cambia el puerto en `server.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Cambia a 5001 u otro
```

### Error: "No se pudo convertir a AVIF"
Reinstala el plugin de AVIF:
```bash
pip uninstall pillow-avif-plugin
pip install pillow-avif-plugin
```

### CORS Error en el navegador
Asegúrate de que `Flask-CORS` esté instalado:
```bash
pip install Flask-CORS
```

## 🔒 Seguridad

Para producción, considera:

1. **Autenticación**: Agrega login/password al panel admin
2. **HTTPS**: Usa certificados SSL
3. **Límites de tamaño**: Ya incluido (100MB máximo)
4. **Validación de archivos**: Ya incluida (solo imágenes)
5. **Rate limiting**: Limita peticiones por IP

## 📝 Notas

- El servidor se ejecuta en modo desarrollo (`debug=True`)
- Para producción, usa un servidor WSGI como Gunicorn
- Las imágenes AVIF tienen excelente compresión (70% más ligeras que JPG)
- El formato se ordena automáticamente alfabéticamente

## 🆘 Soporte

Si encuentras algún problema:
1. Revisa que Python 3.8+ esté instalado
2. Verifica que todas las dependencias estén instaladas
3. Revisa los logs en la terminal donde corre el servidor
4. Verifica los permisos de escritura en la carpeta `comics/`

---

**Desarrollado para Velatron Comics** ⚡
