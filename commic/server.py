#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor Flask para gestionar el panel de administración de Velatron Comics
- Acepta máximo 21 imágenes .avif
- Crea carpetas automáticamente
- Valida formatos y permisos
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import zipfile
import shutil
from PIL import Image
import pillow_avif  # Para soporte de .avif
from pathlib import Path
import time
import gc  # Para forzar liberación de recursos
import tempfile  # Para archivos temporales del sistema
from io import BytesIO  # Para trabajar con archivos en memoria

app = Flask(__name__)
CORS(app)  # Permitir CORS para desarrollo

# Configuración
UPLOAD_FOLDER = 'comics'
MAX_IMAGES = 22
ALLOWED_EXTENSIONS = {'avif'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB por archivo ZIP
TEMPORADAS_PERMITIDAS = ['temporada1', 'temporada2', 'temporada3', 'temporada4', 
                          'temporada5', 'temporada6', 'temporada7']

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Crear carpeta base si no existe
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    """Verifica que el archivo tenga extensión .avif"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def normalize_filename(filename):
    """Normaliza nombres de archivo para evitar problemas"""
    return secure_filename(filename.lower())


def convert_to_avif(image_path, output_path):
    """Convierte una imagen a formato AVIF"""
    try:
        with Image.open(image_path) as img:
            # Convertir a RGB si es necesario
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Guardar como AVIF con buena calidad
            img.save(output_path, 'AVIF', quality=85)
        return True
    except Exception as e:
        print(f"Error convirtiendo {image_path} a AVIF: {str(e)}")
        return False


@app.route('/upload', methods=['POST'])
def upload_comic():
    """
    Endpoint principal para subir cómics
    Acepta: comicName, season, coverImage (file), zipFile (file)
    """
    try:
        # Validar que se recibieron todos los campos
        if 'comicName' not in request.form:
            return jsonify({'success': False, 'message': 'Falta el nombre del cómic'}), 400
        
        if 'season' not in request.form:
            return jsonify({'success': False, 'message': 'Falta la temporada'}), 400
        
        if 'coverImage' not in request.files:
            return jsonify({'success': False, 'message': 'Falta la imagen de portada'}), 400
        
        if 'zipFile' not in request.files:
            return jsonify({'success': False, 'message': 'Falta el archivo ZIP'}), 400
        
        # Obtener datos del formulario
        comic_name = request.form['comicName'].strip()
        season = request.form['season'].strip().lower()
        
        # Validar temporada
        if season not in TEMPORADAS_PERMITIDAS:
            return jsonify({
                'success': False, 
                'message': f'Temporada no válida. Usa: {", ".join(TEMPORADAS_PERMITIDAS)}'
            }), 400
        
        # Normalizar nombre de carpeta del cómic
        comic_folder = ''.join(c if c.isalnum() else '-' for c in comic_name.lower())
        comic_folder = comic_folder.strip('-')
        
        # Archivos
        cover_file = request.files['coverImage']
        zip_file = request.files['zipFile']
        
        # Validar que los archivos no estén vacíos
        if cover_file.filename == '':
            return jsonify({'success': False, 'message': 'No se seleccionó imagen de portada'}), 400
        
        if zip_file.filename == '':
            return jsonify({'success': False, 'message': 'No se seleccionó archivo ZIP'}), 400
        
        # Crear estructura de carpetas
        target_folder = os.path.join(UPLOAD_FOLDER, comic_folder, season)
        os.makedirs(target_folder, exist_ok=True)
        
        # Procesar imagen de portada
        cover_filename = 'principal.avif'
        cover_path = os.path.join(target_folder, cover_filename)
        
        # Si la portada no es AVIF, convertirla
        temp_cover_path = os.path.join(target_folder, 'temp_cover')
        cover_file.save(temp_cover_path)
        
        if not cover_file.filename.lower().endswith('.avif'):
            # Eliminar portada existente si existe
            if os.path.exists(cover_path):
                try:
                    os.remove(cover_path)
                    print(f"✅ Portada anterior eliminada: {cover_path}")
                except Exception as e:
                    print(f"⚠️ Error eliminando portada anterior: {e}")
            
            if not convert_to_avif(temp_cover_path, cover_path):
                os.remove(temp_cover_path)
                return jsonify({'success': False, 'message': 'Error al convertir portada a AVIF'}), 500
            os.remove(temp_cover_path)
        else:
            # Eliminar portada existente si existe antes de renombrar
            if os.path.exists(cover_path):
                try:
                    os.remove(cover_path)
                    print(f"✅ Portada anterior eliminada: {cover_path}")
                except Exception as e:
                    print(f"⚠️ Error eliminando portada anterior: {e}")
            
            # Ahora renombrar temp_cover a principal.avif
            os.rename(temp_cover_path, cover_path)
            print(f"✅ Nueva portada guardada: {cover_path}")
        
        # Procesar archivo ZIP completamente en memoria (evita problemas de bloqueo de Windows)
        print(f"📦 Leyendo ZIP en memoria...")
        zip_bytes = BytesIO(zip_file.read())
        
        # Extraer y procesar imágenes del ZIP directamente desde memoria
        try:
            with zipfile.ZipFile(zip_bytes, 'r') as zip_ref:
                # Obtener lista de archivos de imagen - SOLO .avif permitido
                all_image_files = [f for f in zip_ref.namelist() 
                             if not f.startswith('__MACOSX') and 
                             not f.startswith('.') and
                             f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'))]
                
                # Filtrar solo archivos .avif
                image_files = [f for f in all_image_files if f.lower().endswith('.avif')]
                
                # Validar que todas las imágenes sean .avif
                non_avif_files = [f for f in all_image_files if not f.lower().endswith('.avif')]
                if non_avif_files:
                    zip_bytes.close()
                    shutil.rmtree(target_folder)
                    return jsonify({
                        'success': False,
                        'message': f'Solo se aceptan imágenes .avif. Encontrados {len(non_avif_files)} archivos en otro formato: {', '.join(non_avif_files[:3])}'
                    }), 400
                
                # Validar cantidad de imágenes
                if len(image_files) > MAX_IMAGES:
                    zip_bytes.close()
                    shutil.rmtree(target_folder)
                    return jsonify({
                        'success': False, 
                        'message': f'El ZIP contiene {len(image_files)} imágenes. Máximo permitido: {MAX_IMAGES}'
                    }), 400
                
                if len(image_files) == 0:
                    zip_bytes.close()
                    shutil.rmtree(target_folder)
                    return jsonify({'success': False, 'message': 'El ZIP no contiene imágenes válidas'}), 400
                
                # Ordenar archivos numéricamente por el número en el nombre
                def extract_number(filename):
                    import re
                    # Extraer el primer número del nombre del archivo
                    match = re.search(r'(\d+)', os.path.basename(filename))
                    return int(match.group(1)) if match else 999999
                
                image_files.sort(key=extract_number)
                
                # Extraer y convertir cada imagen
                temp_extract_folder = os.path.join(target_folder, 'temp_extract')
                os.makedirs(temp_extract_folder, exist_ok=True)
                
                processed_count = 0
                for idx, img_file in enumerate(image_files, 1):
                    # Extraer archivo .avif
                    zip_ref.extract(img_file, temp_extract_folder)
                    extracted_path = os.path.join(temp_extract_folder, img_file)
                    
                    # Nombre de salida numerado
                    output_filename = f'{idx}.avif'
                    output_path = os.path.join(target_folder, output_filename)
                    
                    # Eliminar archivo existente si existe (reemplazo)
                    if os.path.exists(output_path):
                        try:
                            os.remove(output_path)
                        except Exception as e:
                            print(f"⚠️ No se pudo eliminar {output_path}: {e}")
                    
                    # Copiar archivo .avif directamente (sin conversión)
                    shutil.copy2(extracted_path, output_path)
                    processed_count += 1
                    print(f"  ✅ Procesado: {idx}.avif")
            
            # El with se cierra aquí, liberando el ZIP completamente
            
            # Liberar memoria del BytesIO
            zip_bytes.close()
            
            # Limpiar carpeta temporal de extracción
            try:
                shutil.rmtree(temp_extract_folder)
                print(f"✅ Carpeta temporal eliminada")
            except Exception as e:
                print(f"⚠️ Advertencia al eliminar temp_extract: {e}")
            
            # Verificar que se procesaron las imágenes
            if processed_count == 0:
                shutil.rmtree(target_folder)
                return jsonify({'success': False, 'message': 'No se pudo procesar ninguna imagen'}), 500
            
            # Retornar éxito
            return jsonify({
                'success': True,
                'message': f'¡Cómic subido exitosamente! {processed_count} imágenes .avif procesadas',
                'data': {
                    'comic_name': comic_name,
                    'folder': comic_folder,
                    'season': season,
                    'path': target_folder,
                    'images_count': processed_count
                }
            }), 200
                
        except zipfile.BadZipFile:
            if 'zip_bytes' in locals():
                zip_bytes.close()
            return jsonify({'success': False, 'message': 'El archivo ZIP está corrupto'}), 400
        except Exception as e:
            if 'zip_bytes' in locals():
                zip_bytes.close()
            return jsonify({'success': False, 'message': f'Error procesando ZIP: {str(e)}'}), 500
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error del servidor: {str(e)}'}), 500


@app.route('/list-comics', methods=['GET'])
def list_comics():
    """Lista todos los cómics disponibles con sus rutas de imágenes"""
    try:
        comics_data = {}
        
        if not os.path.exists(UPLOAD_FOLDER):
            return jsonify({'success': True, 'comics': {}})
        
        # Recorrer carpetas de cómics
        for comic_folder in os.listdir(UPLOAD_FOLDER):
            comic_path = os.path.join(UPLOAD_FOLDER, comic_folder)
            
            if os.path.isdir(comic_path):
                # Recorrer temporadas
                for season in os.listdir(comic_path):
                    season_path = os.path.join(comic_path, season)
                    
                    if os.path.isdir(season_path):
                        # Obtener todas las imágenes AVIF (excepto portada principal)
                        image_files = [f for f in os.listdir(season_path) 
                                     if f.endswith('.avif') and f != 'principal.avif']
                        
                        # Ordenar numéricamente (1, 2, 3... no 1, 10, 11, 2...)
                        import re
                        def extract_number(filename):
                            match = re.search(r'(\d+)', filename)
                            return int(match.group(1)) if match else 999999
                        
                        image_files.sort(key=extract_number)
                        
                        # Construir rutas relativas
                        image_paths = [
                            f'comics/{comic_folder}/{season}/{img}'
                            for img in image_files
                        ]
                        
                        # Usar el nombre de la carpeta del cómic + temporada como key
                        # Ejemplo: jhon-temporada1, keiner-temporada1, etc.
                        comic_key = f'{comic_folder}-{season}'
                        
                        comics_data[comic_key] = {
                            'images': image_paths,
                            'cover': f'comics/{comic_folder}/{season}/principal.avif',
                            'folder': comic_folder,
                            'season': season,
                            'count': len(image_paths)
                        }
        
        return jsonify({'success': True, 'comics': comics_data}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@app.route('/delete-comic', methods=['POST'])
def delete_comic():
    """Elimina un cómic completo o una temporada específica"""
    try:
        data = request.get_json()
        
        if 'comic_folder' not in data:
            return jsonify({'success': False, 'message': 'Falta comic_folder'}), 400
        
        comic_folder = data['comic_folder']
        season = data.get('season')  # Opcional
        
        if season:
            # Eliminar solo una temporada
            target_path = os.path.join(UPLOAD_FOLDER, comic_folder, season)
        else:
            # Eliminar cómic completo
            target_path = os.path.join(UPLOAD_FOLDER, comic_folder)
        
        if not os.path.exists(target_path):
            return jsonify({'success': False, 'message': 'No se encontró el cómic o temporada'}), 404
        
        shutil.rmtree(target_path)
        
        return jsonify({'success': True, 'message': 'Eliminado exitosamente'}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def health():
    """Endpoint para verificar que el servidor está funcionando"""
    return jsonify({
        'status': 'ok',
        'message': 'Servidor Velatron Comics activo',
        'max_images': MAX_IMAGES,
        'allowed_extensions': list(ALLOWED_EXTENSIONS),
        'temporadas_permitidas': TEMPORADAS_PERMITIDAS
    }), 200


if __name__ == '__main__':
    print("🚀 Servidor Velatron Comics iniciado")
    print(f"📁 Carpeta de cómics: {os.path.abspath(UPLOAD_FOLDER)}")
    print(f"📊 Máximo de imágenes: {MAX_IMAGES}")
    print(f"🎨 Formato requerido: .avif")
    print(f"📺 Temporadas permitidas: {', '.join(TEMPORADAS_PERMITIDAS)}")
    print("\n🌐 Servidor corriendo en http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
