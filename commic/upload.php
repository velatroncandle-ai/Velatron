<?php
header('Content-Type: application/json');

// Habilitar CORS si es necesario
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    // Verificar que sea una petición POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }

    // Obtener datos del formulario
    $comicName = $_POST['comicName'] ?? '';
    $season = $_POST['season'] ?? '';
    $comicFolder = $_POST['comicFolder'] ?? '';
    $folderPath = $_POST['folderPath'] ?? '';
    $imageExtension = $_POST['imageExtension'] ?? 'jpg';
    $imagePrefix = $_POST['imagePrefix'] ?? 'pagina';

    // Validar datos requeridos
    if (empty($comicName) || empty($season) || empty($folderPath)) {
        throw new Exception('Faltan datos requeridos');
    }

    // Verificar que se subieron los archivos
    if (!isset($_FILES['coverImage']) || !isset($_FILES['zipFile'])) {
        throw new Exception('No se recibieron los archivos');
    }

    $coverImage = $_FILES['coverImage'];
    $zipFile = $_FILES['zipFile'];

    // Verificar errores en la subida
    if ($coverImage['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al subir la imagen de portada');
    }

    if ($zipFile['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al subir el archivo ZIP');
    }

    // Verificar que el archivo sea un ZIP
    $zipMimeTypes = ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'];
    if (!in_array($zipFile['type'], $zipMimeTypes) && pathinfo($zipFile['name'], PATHINFO_EXTENSION) !== 'zip') {
        throw new Exception('El archivo debe ser un ZIP');
    }

    // Crear la estructura de carpetas
    if (!file_exists($folderPath)) {
        if (!mkdir($folderPath, 0755, true)) {
            throw new Exception('No se pudo crear la carpeta: ' . $folderPath);
        }
    }

    // Guardar la imagen de portada
    $coverExtension = pathinfo($coverImage['name'], PATHINFO_EXTENSION);
    $coverDestination = $folderPath . '/portada.' . $coverExtension;
    
    if (!move_uploaded_file($coverImage['tmp_name'], $coverDestination)) {
        throw new Exception('No se pudo guardar la imagen de portada');
    }

    // Descomprimir el archivo ZIP
    $zip = new ZipArchive();
    $zipPath = $zipFile['tmp_name'];
    
    if ($zip->open($zipPath) === TRUE) {
        // Extraer todos los archivos
        $zip->extractTo($folderPath);
        $numFiles = $zip->numFiles;
        $zip->close();
        
        // Eliminar el archivo ZIP temporal (ya fue procesado)
        @unlink($zipPath);
        
        // Contar imágenes extraídas
        $images = glob($folderPath . '/*.{jpg,jpeg,png,gif,webp,avif}', GLOB_BRACE);
        $imageCount = count($images);
        
        // Respuesta exitosa
        echo json_encode([
            'success' => true,
            'message' => "✓ Cómic subido exitosamente! Se extrajeron {$imageCount} imágenes en: {$folderPath}",
            'data' => [
                'folderPath' => $folderPath,
                'comicFolder' => $comicFolder,
                'season' => $season,
                'imagesExtracted' => $imageCount,
                'coverImage' => $coverDestination
            ]
        ]);
        
    } else {
        throw new Exception('No se pudo abrir el archivo ZIP. Verifica que sea un archivo válido.');
    }

} catch (Exception $e) {
    // Respuesta de error
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
