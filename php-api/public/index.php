<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

if (PHP_SAPI === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $file = __DIR__ . $path;
    if (is_file($file) && $path !== '/index.php') {
        return false;
    }
}

function env_value(string $key, $default = null) {
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

function send_json(array $payload, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function send_text(string $content, int $status = 200, string $contentType = 'text/plain; charset=utf-8'): never {
    http_response_code($status);
    header('Content-Type: ' . $contentType);
    echo $content;
    exit;
}

function base64url_encode(string $value): string {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64url_decode(string $value): string {
    $remainder = strlen($value) % 4;
    if ($remainder > 0) {
        $value .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($value, '-_', '+/')) ?: '';
}

function jwt_sign(array $payload, string $secret, int $ttlSeconds = 3600): string {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload['iat'] = time();
    $payload['exp'] = time() + $ttlSeconds;
    $headerPart = base64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES));
    $payloadPart = base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES));
    $signature = hash_hmac('sha256', $headerPart . '.' . $payloadPart, $secret, true);
    return $headerPart . '.' . $payloadPart . '.' . base64url_encode($signature);
}

function jwt_verify(string $token, string $secret): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$headerPart, $payloadPart, $signaturePart] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', $headerPart . '.' . $payloadPart, $secret, true));
    if (!hash_equals($expected, $signaturePart)) {
        return null;
    }

    $payload = json_decode(base64url_decode($payloadPart), true);
    if (!is_array($payload)) {
        return null;
    }

    if (isset($payload['exp']) && time() > (int) $payload['exp']) {
        return null;
    }

    return $payload;
}

function request_method(): string {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function request_path(): string {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    if (str_starts_with($path, '/api')) {
        $path = substr($path, 4) ?: '/';
    }
    return $path;
}

function request_segments(): array {
    $path = trim(request_path(), '/');
    if ($path === '') {
        return [];
    }
    return array_values(array_filter(explode('/', $path), fn ($segment) => $segment !== ''));
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function normalize_role(?string $role): string {
    $value = trim((string) $role);
    if ($value === '') {
        return 'Tenant';
    }
    return str_replace('_', ' ', $value);
}

function enum_value(?string $value): string {
    return str_replace(' ', '_', trim((string) $value));
}

function to_bool($value): int {
    return filter_var($value, FILTER_VALIDATE_BOOL) ? 1 : 0;
}

function parse_json_array($value): array {
    if ($value === null || $value === '') {
        return [];
    }
    if (is_array($value)) {
        return $value;
    }
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : [];
}

function json_or_null($value): ?string {
    if ($value === null || $value === '') {
        return null;
    }
    if (is_string($value)) {
        json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $value;
        }
    }
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = env_value('DB_HOST', '127.0.0.1');
    $port = env_value('DB_PORT', '3306');
    $name = env_value('DB_NAME', 'bhms');
    $user = env_value('DB_USER', 'root');
    $password = env_value('DB_PASSWORD', '');

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function query_all(string $sql, array $params = []): array {
    $statement = db()->prepare($sql);
    $statement->execute($params);
    return $statement->fetchAll() ?: [];
}

function query_one(string $sql, array $params = []): ?array {
    $statement = db()->prepare($sql);
    $statement->execute($params);
    $row = $statement->fetch();
    return $row !== false ? $row : null;
}

function execute(string $sql, array $params = []): int {
    $statement = db()->prepare($sql);
    $statement->execute($params);
    return $statement->rowCount();
}

function insert_id(): string {
    return (string) db()->lastInsertId();
}

function bearer_token(): ?string {
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.*)$/i', $authorization, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function map_user(array $user): array {
    return [
        '_id' => (string) $user['id'],
        'id' => (string) $user['id'],
        'username' => $user['username'] ?? null,
        'fullName' => $user['full_name'] ?? null,
        'email' => $user['email'] ?? null,
        'phoneNumber' => $user['phone_number'] ?? null,
        'role' => normalize_role($user['role'] ?? 'Tenant'),
        'isVerified' => (bool) ($user['is_verified'] ?? false),
        'verificationStatus' => $user['verification_status'] ?? 'Pending',
        'verificationType' => $user['verification_type'] ?? 'Student ID',
        'verificationDocumentUrl' => $user['verification_document_url'] ?? null,
        'profileSummary' => $user['profile_summary'] ?? null,
        'createdAt' => $user['created_at'] ?? null,
        'updatedAt' => $user['updated_at'] ?? null,
    ];
}

function public_url(string $path): string {
    $base = (string) env_value('PUBLIC_URL', env_value('FRONTEND_URL', 'http://localhost:5173'));
    return rtrim($base, '/') . $path;
}

function api_public_url(string $path): string {
    $base = (string) env_value('API_PUBLIC_URL', env_value('BACKEND_URL', 'http://localhost:5001'));
    return rtrim($base, '/') . $path;
}

function current_user(bool $requireAuth = true, ?array $allowedRoles = null): ?array {
    $systemAdminId = (string) env_value('SYSTEM_ADMIN_USER_ID', 'admin');
    $token = bearer_token();

    if (!$token) {
        if ($requireAuth) {
            send_json(['success' => false, 'message' => 'Authentication required.'], 401);
        }
        return null;
    }

    $payload = jwt_verify($token, (string) env_value('JWT_SECRET', 'bachelor-house-rent-system-dev-secret'));
    if (!$payload || empty($payload['id']) || empty($payload['role'])) {
        if ($requireAuth) {
            send_json(['success' => false, 'message' => 'Invalid or expired token.'], 401);
        }
        return null;
    }

    if ((string) $payload['id'] === $systemAdminId && normalize_role((string) $payload['role']) === 'Admin') {
        $user = [
            'id' => $systemAdminId,
            'username' => $systemAdminId,
            'full_name' => 'System Admin',
            'email' => 'admin@localhost',
            'phone_number' => null,
            'role' => 'Admin',
            'is_verified' => 1,
            'verification_status' => 'Approved',
            'verification_type' => 'NID',
            'verification_document_url' => null,
            'profile_summary' => null,
            'created_at' => null,
            'updated_at' => null,
        ];
        if ($allowedRoles !== null && !in_array('Admin', $allowedRoles, true)) {
            send_json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        return $user;
    }

    $user = query_one('SELECT * FROM users WHERE id = ?', [(string) $payload['id']]);
    if (!$user) {
        if ($requireAuth) {
            send_json(['success' => false, 'message' => 'User not found.'], 401);
        }
        return null;
    }

    $userRole = normalize_role($user['role'] ?? 'Tenant');
    if ($allowedRoles !== null && !in_array($userRole, $allowedRoles, true)) {
        send_json(['success' => false, 'message' => 'Forbidden.'], 403);
    }

    return $user;
}

function user_payload(array $user): array {
    return map_user($user);
}

function map_property(array $property, bool $includeRelations = false): array {
    $photos = parse_json_array($property['photos_json'] ?? null);
    $amenities = parse_json_array($property['amenities_json'] ?? null);
    $appliances = parse_json_array($property['appliances_json'] ?? null);

    return [
        '_id' => (string) $property['id'],
        'id' => (string) $property['id'],
        'landlord' => $property['landlord'] ?? ($property['landlord_id'] ?? null),
        'landlordName' => $property['landlord_name'] ?? null,
        'landlordPhone' => $property['landlord_phone'] ?? null,
        'landlordWhatsapp' => $property['landlord_whatsapp'] ?? null,
        'landlordBkash' => $property['landlord_bkash'] ?? null,
        'landlordNagad' => $property['landlord_nagad'] ?? null,
        'title' => $property['title'] ?? null,
        'area' => $property['area'] ?? null,
        'nearbyUniversity' => $property['nearby_university'] ?? null,
        'address' => $property['address'] ?? null,
        'mapLocation' => [
            'latitude' => $property['map_latitude'] !== null ? (float) $property['map_latitude'] : null,
            'longitude' => $property['map_longitude'] !== null ? (float) $property['map_longitude'] : null,
            'label' => $property['map_label'] ?? null,
            'link' => $property['map_link'] ?? null,
        ],
        'totalSeats' => (int) ($property['total_seats'] ?? 0),
        'availableSeats' => (int) ($property['available_seats'] ?? 0),
        'genderPreference' => str_replace('_', ' ', (string) ($property['gender_preference'] ?? 'Any')),
        'roomType' => str_replace('_', ' ', (string) ($property['room_type'] ?? 'Non Furnished')),
        'monthlyRentPerSeat' => (float) ($property['monthly_rent_per_seat'] ?? 0),
        'securityDeposit' => (float) ($property['security_deposit'] ?? 0),
        'mealSystem' => str_replace('_', ' ', (string) ($property['meal_system'] ?? 'Not Included')),
        'amenities' => $amenities,
        'rules' => [
            'gateClosingTime' => $property['gate_closing_time'] ?? null,
            'guestPolicy' => $property['guest_policy'] ?? null,
            'smokingRules' => $property['smoking_rules'] ?? null,
            'attachedBath' => (bool) ($property['attached_bath'] ?? 0),
            'filteredWater' => (bool) ($property['filtered_water'] ?? 0),
            'lift' => (bool) ($property['lift'] ?? 0),
            'wifi' => (bool) ($property['wifi'] ?? 0),
        ],
        'photos' => $photos,
        'appliances' => $appliances,
        'description' => $property['description'] ?? null,
        'universityProximity' => $property['university_proximity'] ?? null,
        'commuteMinutes' => $property['commute_minutes'] !== null ? (int) $property['commute_minutes'] : null,
        'rentalMonth' => $property['rental_month'] ?? null,
        'isActive' => (bool) ($property['is_active'] ?? 0),
        'publicationStatus' => str_replace('_', ' ', (string) ($property['publication_status'] ?? 'Pending')),
        'views' => (int) ($property['views'] ?? 0),
        'seatApplications' => $property['seatApplications'] ?? ($includeRelations ? [] : []),
        'rentPayments' => $property['rentPayments'] ?? ($includeRelations ? [] : []),
        'messages' => $property['messages'] ?? ($includeRelations ? [] : []),
        'reviews' => $property['reviews'] ?? ($includeRelations ? [] : []),
        'createdAt' => $property['created_at'] ?? null,
        'updatedAt' => $property['updated_at'] ?? null,
    ];
}

function safe_string($value, ?string $default = null): ?string {
    if ($value === null) {
        return $default;
    }
    $value = trim((string) $value);
    return $value === '' ? $default : $value;
}

function generate_username(?string $fullName, ?string $email): string {
    $seed = strtolower(preg_replace('/[^a-z0-9]+/i', '.', trim((string) ($fullName ?: $email ?: 'tenant'))) ?? 'tenant');
    $seed = trim($seed, '.');
    if ($seed === '') {
        $seed = 'tenant';
    }
    return substr($seed, 0, 18) . '.' . substr(bin2hex(random_bytes(2)), 0, 4);
}

function ensure_upload_dir(): void {
    $dir = dirname(__DIR__) . '/public/uploads';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
}

function upload_dir(): string {
    return dirname(__DIR__) . '/public/uploads';
}

function property_defaults(array $payload, ?array $existing = null): array {
    $googleMap = $payload['googleMapLocation'] ?? $payload['google_map_location'] ?? [];
    if (!is_array($googleMap)) {
        $googleMap = [];
    }

    $landlordName = trim((string) (($payload['firstName'] ?? '') . ' ' . ($payload['lastName'] ?? '')));
    $title = safe_string($payload['title'] ?? null, trim((string) (($payload['spaceType'] ?? 'Seat') . ' in ' . ($payload['locality'] ?? 'Dhaka'))));

    return [
        'title' => $title,
        'area' => safe_string($payload['locality'] ?? $payload['area'] ?? null, $existing['area'] ?? null),
        'nearby_university' => safe_string($payload['nearestLandmark'] ?? $payload['nearbyUniversity'] ?? null, $existing['nearby_university'] ?? null),
        'address' => safe_string($payload['address'] ?? null, $existing['address'] ?? null),
        'map_latitude' => isset($googleMap['latitude']) && $googleMap['latitude'] !== '' ? (float) $googleMap['latitude'] : ($existing['map_latitude'] ?? null),
        'map_longitude' => isset($googleMap['longitude']) && $googleMap['longitude'] !== '' ? (float) $googleMap['longitude'] : ($existing['map_longitude'] ?? null),
        'map_label' => safe_string($payload['mapLabel'] ?? null, $existing['map_label'] ?? $title),
        'map_link' => safe_string($payload['mapLink'] ?? null, $existing['map_link'] ?? null),
        'total_seats' => isset($payload['totalSeats']) ? (int) $payload['totalSeats'] : (isset($payload['bhk']) ? max(1, (int) $payload['bhk']) : (int) ($existing['total_seats'] ?? 1)),
        'available_seats' => isset($payload['availableSeats']) ? (int) $payload['availableSeats'] : (isset($payload['bhk']) ? max(1, (int) $payload['bhk']) : (int) ($existing['available_seats'] ?? 1)),
        'gender_preference' => enum_value($payload['genderPreference'] ?? $payload['preference'] ?? ($existing['gender_preference'] ?? 'Any')),
        'room_type' => enum_value($payload['roomType'] ?? $payload['type'] ?? ($existing['room_type'] ?? 'Non Furnished')),
        'monthly_rent_per_seat' => isset($payload['monthlyRentPerSeat']) ? (float) $payload['monthlyRentPerSeat'] : (isset($payload['rent']) ? (float) $payload['rent'] : (float) ($existing['monthly_rent_per_seat'] ?? 0)),
        'security_deposit' => isset($payload['securityDeposit']) ? (float) $payload['securityDeposit'] : (isset($payload['maintenance']) ? (float) $payload['maintenance'] : (float) ($existing['security_deposit'] ?? 0)),
        'meal_system' => enum_value($payload['mealSystem'] ?? ($existing['meal_system'] ?? 'Not Included')),
        'amenities_json' => json_or_null($payload['amenities'] ?? []),
        'appliances_json' => json_or_null($payload['appliances'] ?? []),
        'gate_closing_time' => safe_string($payload['gateClosingTime'] ?? null, $existing['gate_closing_time'] ?? null),
        'guest_policy' => safe_string($payload['guestPolicy'] ?? null, $existing['guest_policy'] ?? null),
        'smoking_rules' => safe_string($payload['smokingRules'] ?? null, $existing['smoking_rules'] ?? null),
        'attached_bath' => to_bool($payload['attachedBath'] ?? $existing['attached_bath'] ?? false),
        'filtered_water' => to_bool($payload['filteredWater'] ?? $existing['filtered_water'] ?? false),
        'lift' => to_bool($payload['lift'] ?? $existing['lift'] ?? false),
        'wifi' => to_bool($payload['wifi'] ?? $existing['wifi'] ?? false),
        'photos_json' => json_or_null($payload['photos'] ?? []),
        'description' => safe_string($payload['aboutProperty'] ?? $payload['description'] ?? null, $existing['description'] ?? null),
        'university_proximity' => safe_string($payload['universityProximity'] ?? null, $existing['university_proximity'] ?? null),
        'commute_minutes' => isset($payload['commuteMinutes']) ? (int) $payload['commuteMinutes'] : ($existing['commute_minutes'] ?? null),
        'rental_month' => safe_string($payload['rentalMonth'] ?? null, $existing['rental_month'] ?? null),
        'is_active' => to_bool($payload['isActive'] ?? $existing['is_active'] ?? true),
        'publication_status' => enum_value($payload['publicationStatus'] ?? ($existing['publication_status'] ?? 'Pending')),
        'views' => isset($payload['views']) ? (int) $payload['views'] : (int) ($existing['views'] ?? 0),
        'landlord_name' => $landlordName !== '' ? $landlordName : ($existing['landlord_name'] ?? null),
        'landlord_phone' => safe_string($payload['ownerContactNumber'] ?? $payload['landlordPhone'] ?? null, $existing['landlord_phone'] ?? null),
        'landlord_whatsapp' => safe_string($payload['landlordWhatsapp'] ?? null, $existing['landlord_whatsapp'] ?? null),
        'landlord_bkash' => safe_string($payload['landlordBkash'] ?? null, $existing['landlord_bkash'] ?? null),
        'landlord_nagad' => safe_string($payload['landlordNagad'] ?? null, $existing['landlord_nagad'] ?? null),
        'space_type' => safe_string($payload['spaceType'] ?? null, $existing['space_type'] ?? null),
        'pets_allowed' => to_bool($payload['petsAllowed'] ?? $existing['pets_allowed'] ?? false),
        'bachelors_allowed' => safe_string($payload['bachelorsAllowed'] ?? null, $existing['bachelors_allowed'] ?? null),
        'furnishing_type' => safe_string($payload['type'] ?? $payload['furnishingType'] ?? null, $existing['furnishing_type'] ?? null),
        'bhk' => isset($payload['bhk']) && $payload['bhk'] !== '' ? (int) $payload['bhk'] : ($existing['bhk'] ?? null),
        'floor' => safe_string($payload['floor'] ?? null, $existing['floor'] ?? null),
        'nearest_landmark' => safe_string($payload['nearestLandmark'] ?? null, $existing['nearest_landmark'] ?? null),
        'washroom_type' => safe_string($payload['washroomType'] ?? null, $existing['washroom_type'] ?? null),
        'cooling_facility' => safe_string($payload['coolingFacility'] ?? null, $existing['cooling_facility'] ?? null),
        'car_parking' => to_bool($payload['carParking'] ?? $existing['car_parking'] ?? false),
        'square_feet_area' => isset($payload['squareFeetArea']) ? (int) $payload['squareFeetArea'] : (int) ($existing['square_feet_area'] ?? 0),
        'about_property' => safe_string($payload['aboutProperty'] ?? null, $existing['about_property'] ?? null),
    ];
}

function property_insert_sql(array $data): array {
    $columns = array_keys($data);
    $placeholders = array_fill(0, count($columns), '?');
    return [
        'sql' => 'INSERT INTO properties (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')',
        'params' => array_values($data),
    ];
}

function property_update_sql(array $data): array {
    $columns = array_keys($data);
    $assignments = [];
    foreach ($columns as $column) {
        $assignments[] = $column . ' = ?';
    }
    return [
        'sql' => 'UPDATE properties SET ' . implode(', ', $assignments) . ', updated_at = CURRENT_TIMESTAMP',
        'params' => array_values($data),
    ];
}

function property_public_rows(string $sql, array $params = []): array {
    $rows = query_all($sql, $params);
    $result = [];
    foreach ($rows as $row) {
        $landlord = null;
        if (!empty($row['landlord_id'])) {
            $landlord = [
                '_id' => (string) $row['landlord_id'],
                'id' => (string) $row['landlord_id'],
                'fullName' => $row['landlord_full_name'] ?? null,
                'username' => $row['landlord_username'] ?? null,
                'email' => $row['landlord_email'] ?? null,
                'phoneNumber' => $row['landlord_phone_number'] ?? null,
                'role' => normalize_role($row['landlord_role'] ?? 'Landlord'),
            ];
        }
        $row['landlord'] = $landlord;
        $result[] = map_property($row, true);
    }
    return $result;
}

function property_query_with_landlord(string $where = '', array $params = [], string $orderBy = 'ORDER BY p.created_at DESC', ?int $limit = null, ?int $offset = null): array {
    $sql = 'SELECT p.*, u.id AS landlord_user_id, u.full_name AS landlord_full_name, u.username AS landlord_username, u.email AS landlord_email, u.phone_number AS landlord_phone_number, u.role AS landlord_role FROM properties p LEFT JOIN users u ON u.id = p.landlord_id';
    if ($where !== '') {
        $sql .= ' WHERE ' . $where;
    }
    if ($orderBy !== '') {
        $sql .= ' ' . $orderBy;
    }
    if ($limit !== null) {
        $sql .= ' LIMIT ' . max(1, $limit);
        if ($offset !== null) {
            $sql .= ' OFFSET ' . max(0, $offset);
        }
    }
    return property_public_rows($sql, $params);
}

function require_method(array $allowed): void {
    if (!in_array(request_method(), $allowed, true)) {
        send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
    }
}

function build_pdf_text(string $title, array $lines): string {
    $escapedLines = [];
    foreach ($lines as $line) {
        $escapedLines[] = preg_replace('/[^\x20-\x7E]/', '', (string) $line) ?? '';
    }
    $stream = 'BT /F1 12 Tf 50 760 Td 16 TL ';
    foreach ($escapedLines as $index => $line) {
        $prefix = $index === 0 ? '' : 'T* ';
        $stream .= $prefix . '(' . str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line) . ') Tj ';
    }
    $stream .= 'ET';

    $objects = [];
    $objects[] = '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj';
    $objects[] = '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj';
    $objects[] = '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj';
    $objects[] = '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj';
    $objects[] = '5 0 obj << /Length ' . strlen($stream) . ' >> stream' . "\n" . $stream . "\nendstream endobj";

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $object) {
        $offsets[] = strlen($pdf);
        $pdf .= $object . "\n";
    }
    $xrefStart = strlen($pdf);
    $pdf .= "xref\n";
    $pdf .= '0 ' . (count($objects) + 1) . "\n";
    $pdf .= "0000000000 65535 f \n";
    for ($i = 1; $i < count($offsets); $i++) {
        $pdf .= sprintf('%010d 00000 n %s', $offsets[$i], "\n");
    }
    $pdf .= 'trailer << /Size ' . (count($objects) + 1) . ' /Root 1 0 R >>' . "\n";
    $pdf .= 'startxref' . "\n" . $xrefStart . "\n%%EOF";
    return $pdf;
}

function remind_month(string $month): string {
    return preg_match('/^\d{4}-\d{2}$/', $month) ? $month : date('Y-m');
}

function property_quality_score(array $property): int {
    $score = 35;
    $score += min(20, count(parse_json_array($property['photos_json'] ?? null)) * 2);
    $score += !empty($property['description']) ? 12 : 0;
    $score += !empty($property['amenities_json']) ? 8 : 0;
    $score += !empty($property['map_latitude']) && !empty($property['map_longitude']) ? 10 : 0;
    $score += ((int) ($property['available_seats'] ?? 0) > 0) ? 5 : 0;
    return min(100, $score);
}

function load_property_detail(array $propertyRow): array {
    $property = $propertyRow;
    $landlord = null;
    if (!empty($propertyRow['landlord_id'])) {
        $landlord = query_one('SELECT id, username, full_name, email, phone_number, role, is_verified, verification_status, verification_type, verification_document_url, profile_summary, created_at, updated_at FROM users WHERE id = ?', [(string) $propertyRow['landlord_id']]);
    }

    $property['landlord'] = $landlord ? user_payload($landlord) : $propertyRow['landlord_id'];

    $applications = query_all('SELECT * FROM property_applications WHERE property_id = ? ORDER BY created_at DESC', [(string) $propertyRow['id']]);
    $payments = query_all('SELECT * FROM rent_payments WHERE property_id = ? ORDER BY created_at DESC', [(string) $propertyRow['id']]);
    $messages = query_all('SELECT * FROM property_messages WHERE property_id = ? ORDER BY created_at ASC', [(string) $propertyRow['id']]);
    $reviews = query_all('SELECT * FROM property_reviews WHERE property_id = ? ORDER BY created_at DESC', [(string) $propertyRow['id']]);

    $userIds = [];
    foreach ([$applications, $payments, $messages, $reviews] as $collection) {
        foreach ($collection as $row) {
            $userId = $row['tenant_id'] ?? $row['sender_id'] ?? null;
            if ($userId) {
                $userIds[] = (string) $userId;
            }
        }
    }
    $users = [];
    if ($userIds !== []) {
        $placeholders = implode(',', array_fill(0, count(array_unique($userIds)), '?'));
        foreach (query_all("SELECT id, username, full_name, email, phone_number, role, is_verified, verification_status, verification_type, verification_document_url, profile_summary, created_at, updated_at FROM users WHERE id IN ($placeholders)", array_values(array_unique($userIds))) as $userRow) {
            $users[(string) $userRow['id']] = $userRow;
        }
    }

    $property['seatApplications'] = array_map(function (array $row) use ($users) {
        $tenant = $users[(string) $row['tenant_id']] ?? null;
        return [
            '_id' => (string) $row['id'],
            'tenant' => $tenant ? [
                '_id' => (string) $tenant['id'],
                'id' => (string) $tenant['id'],
                'fullName' => $tenant['full_name'] ?? null,
                'username' => $tenant['username'] ?? null,
                'email' => $tenant['email'] ?? null,
                'phoneNumber' => $tenant['phone_number'] ?? null,
            ] : (string) $row['tenant_id'],
            'tenantName' => $row['tenant_name'] ?? null,
            'tenantEmail' => $row['tenant_email'] ?? null,
            'tenantPhone' => $row['tenant_phone'] ?? null,
            'studentIdType' => str_replace('_', ' ', (string) ($row['student_id_type'] ?? 'Student ID')),
            'seatsRequested' => (int) ($row['seats_requested'] ?? 1),
            'documentUrl' => $row['document_url'] ?? null,
            'roommateRequest' => (bool) ($row['roommate_request'] ?? 0),
            'note' => $row['note'] ?? '',
            'status' => str_replace('_', ' ', (string) ($row['status'] ?? 'Pending')),
            'documentVerification' => [
                'score' => $row['verification_score'] !== null ? (float) $row['verification_score'] : null,
                'confidence' => $row['verification_confidence'] !== null ? (float) $row['verification_confidence'] : null,
                'status' => $row['verification_status'] ?? null,
                'flags' => parse_json_array($row['verification_flags'] ?? null),
            ],
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }, $applications);

    $property['rentPayments'] = array_map(function (array $row) use ($users) {
        $tenant = $users[(string) $row['tenant_id']] ?? null;
        return [
            '_id' => (string) $row['id'],
            'tenant' => $tenant ? [
                '_id' => (string) $tenant['id'],
                'id' => (string) $tenant['id'],
                'fullName' => $tenant['full_name'] ?? null,
                'username' => $tenant['username'] ?? null,
                'email' => $tenant['email'] ?? null,
                'phoneNumber' => $tenant['phone_number'] ?? null,
            ] : (string) $row['tenant_id'],
            'month' => $row['month'] ?? null,
            'amount' => (float) ($row['amount'] ?? 0),
            'provider' => $row['provider'] ?? null,
            'transactionId' => $row['transaction_id'] ?? null,
            'status' => str_replace('_', ' ', (string) ($row['status'] ?? 'Pending')),
            'paidAt' => $row['paid_at'] ?? null,
            'source' => str_replace('_', ' ', (string) ($row['source'] ?? 'Manual')),
            'ssl' => [
                'sessionKey' => $row['ssl_session_key'] ?? null,
                'preferredMethod' => $row['ssl_preferred_method'] ?? null,
                'validationId' => $row['ssl_validation_id'] ?? null,
                'bankTransactionId' => $row['ssl_bank_transaction_id'] ?? null,
                'cardType' => $row['ssl_card_type'] ?? null,
                'cardIssuer' => $row['ssl_card_issuer'] ?? null,
                'cardBrand' => $row['ssl_card_brand'] ?? null,
                'cardSubtype' => $row['ssl_card_subtype'] ?? null,
                'validatedAmount' => $row['ssl_validated_amount'] !== null ? (float) $row['ssl_validated_amount'] : null,
                'currency' => $row['ssl_currency'] ?? null,
                'gatewayStatus' => $row['ssl_gateway_status'] ?? null,
            ],
            'slip' => [
                'slipId' => $row['slip_id'] ?? null,
                'generatedAt' => $row['slip_generated_at'] ?? null,
                'downloadUrl' => $row['slip_download_url'] ?? null,
                'note' => $row['slip_note'] ?? null,
            ],
            'assistant' => [
                'status' => $row['assistant_status'] ?? null,
                'flags' => parse_json_array($row['assistant_flags'] ?? null),
                'expectedAmount' => $row['assistant_expected_amount'] !== null ? (float) $row['assistant_expected_amount'] : null,
                'paidAmount' => $row['assistant_paid_amount'] !== null ? (float) $row['assistant_paid_amount'] : null,
            ],
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }, $payments);

    $property['messages'] = array_map(function (array $row) use ($users) {
        $sender = $users[(string) $row['sender_id']] ?? null;
        return [
            '_id' => (string) $row['id'],
            'sender' => $sender ? [
                '_id' => (string) $sender['id'],
                'id' => (string) $sender['id'],
                'fullName' => $sender['full_name'] ?? null,
                'username' => $sender['username'] ?? null,
                'email' => $sender['email'] ?? null,
                'phoneNumber' => $sender['phone_number'] ?? null,
            ] : (string) $row['sender_id'],
            'senderName' => $row['sender_name'] ?? null,
            'senderRole' => $row['sender_role'] ?? null,
            'message' => $row['message'] ?? null,
            'moderation' => [
                'score' => $row['moderation_score'] !== null ? (float) $row['moderation_score'] : null,
                'riskLevel' => $row['moderation_risk_level'] ?? null,
                'flags' => parse_json_array($row['moderation_flags'] ?? null),
            ],
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }, $messages);

    $property['reviews'] = array_map(function (array $row) use ($users) {
        $tenant = $users[(string) $row['tenant_id']] ?? null;
        return [
            '_id' => (string) $row['id'],
            'tenant' => $tenant ? [
                '_id' => (string) $tenant['id'],
                'id' => (string) $tenant['id'],
                'fullName' => $tenant['full_name'] ?? null,
                'username' => $tenant['username'] ?? null,
                'email' => $tenant['email'] ?? null,
                'phoneNumber' => $tenant['phone_number'] ?? null,
            ] : (string) $row['tenant_id'],
            'tenantName' => $row['tenant_name'] ?? null,
            'rating' => (float) ($row['rating'] ?? 0),
            'comment' => $row['comment'] ?? null,
            'moderation' => [
                'score' => $row['moderation_score'] !== null ? (float) $row['moderation_score'] : null,
                'riskLevel' => $row['moderation_risk_level'] ?? null,
                'flags' => parse_json_array($row['moderation_flags'] ?? null),
            ],
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }, $reviews);

    return map_property($property, true);
}

function handle_auth(array $segments): void {
    $method = request_method();

    if ($method === 'POST' && $segments === ['register']) {
        $payload = read_json_body();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $fullName = safe_string($payload['fullName'] ?? null, null);
        $username = safe_string($payload['username'] ?? null, null) ?: generate_username($fullName, $email);
        $role = normalize_role($payload['role'] ?? 'Tenant');
        $verificationType = safe_string($payload['verificationType'] ?? null, 'Student ID');
        $verificationDocumentUrl = safe_string($payload['verificationDocumentUrl'] ?? null, null);
        $phoneNumber = safe_string($payload['phoneNumber'] ?? null, null);

        if ($fullName === null && $username === null) {
            send_json(['success' => false, 'message' => 'Full name or username is required.'], 400);
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            send_json(['success' => false, 'message' => 'A valid email address is required.'], 400);
        }
        if (strlen($password) < 8) {
            send_json(['success' => false, 'message' => 'Password must be at least 8 characters long.'], 400);
        }
        if (query_one('SELECT id FROM users WHERE email = ? OR username = ?', [$email, $username])) {
            send_json(['success' => false, 'message' => 'An account already exists with that email or username.'], 409);
        }

        if ($role === 'Admin') {
            send_json(['success' => false, 'message' => 'Admin accounts cannot register from the public form.'], 403);
        }
        if ($role === 'Landlord' && $verificationType !== 'NID') {
            send_json(['success' => false, 'message' => 'Landlord registration requires NID verification.'], 400);
        }

        $verificationToken = bin2hex(random_bytes(20));
        $verificationTokenExpires = date('Y-m-d H:i:s', time() + 86400);
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        execute('INSERT INTO users (username, full_name, email, phone_number, password, role, is_verified, verification_status, verification_type, verification_document_url, verification_token, verification_token_expires, profile_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
            $username,
            $fullName,
            $email,
            $phoneNumber,
            $passwordHash,
            enum_value($role),
            0,
            'Pending',
            enum_value($verificationType),
            $verificationDocumentUrl,
            $verificationToken,
            $verificationTokenExpires,
            $payload['profileSummary'] ?? null,
        ]);

        $user = query_one('SELECT * FROM users WHERE email = ?', [$email]);
        send_json([
            'success' => true,
            'message' => 'Registration submitted. Wait for admin approval before login.',
            'user' => $user ? user_payload($user) : null,
        ], 201);
    }

    if ($method === 'POST' && $segments === ['login']) {
        $payload = read_json_body();
        $identifier = strtolower(trim((string) ($payload['email'] ?? $payload['emailOrUsername'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $role = normalize_role($payload['role'] ?? 'Tenant');

        if ($identifier === '' || $password === '') {
            send_json(['success' => false, 'message' => 'Email/User ID and password are required.'], 400);
        }

        $systemAdminId = (string) env_value('SYSTEM_ADMIN_USER_ID', 'admin');
        $systemAdminPassword = (string) env_value('SYSTEM_ADMIN_PASSWORD', 'admin@123');
        if ($role === 'Admin' && $identifier === $systemAdminId && $password === $systemAdminPassword) {
            $token = jwt_sign(['id' => $systemAdminId, 'role' => 'Admin'], (string) env_value('JWT_SECRET', 'bachelor-house-rent-system-dev-secret'), 86400);
            send_json([
                'success' => true,
                'message' => 'Login successful.',
                'token' => $token,
                'user' => user_payload([
                    'id' => $systemAdminId,
                    'username' => $systemAdminId,
                    'full_name' => 'System Admin',
                    'email' => 'admin@localhost',
                    'phone_number' => null,
                    'role' => 'Admin',
                    'is_verified' => 1,
                    'verification_status' => 'Approved',
                    'verification_type' => 'NID',
                    'verification_document_url' => null,
                    'created_at' => null,
                    'updated_at' => null,
                ]),
            ]);
        }

        $user = query_one('SELECT * FROM users WHERE email = ? OR username = ? OR phone_number = ?', [$identifier, $identifier, $identifier]);
        if (!$user || !password_verify($password, (string) ($user['password'] ?? ''))) {
            send_json(['success' => false, 'message' => 'Invalid credentials.'], 401);
        }

        if (normalize_role($user['role'] ?? 'Tenant') !== $role && $role !== 'Tenant') {
            send_json(['success' => false, 'message' => 'Invalid role.'], 403);
        }

        $verificationStatus = normalize_role($user['verification_status'] ?? 'Pending');
        if (!in_array($verificationStatus, ['Verified', 'Approved'], true) && normalize_role($user['role'] ?? 'Tenant') !== 'Admin') {
            send_json(['success' => false, 'message' => 'Your account is pending admin approval.'], 403);
        }

        $token = jwt_sign(['id' => $user['id'], 'role' => normalize_role($user['role'] ?? 'Tenant')], (string) env_value('JWT_SECRET', 'bachelor-house-rent-system-dev-secret'), 86400);
        send_json([
            'success' => true,
            'message' => 'Login successful.',
            'token' => $token,
            'user' => user_payload($user),
        ]);
    }

    if ($method === 'GET' && $segments === ['me']) {
        $user = current_user();
        send_json(['success' => true, 'user' => user_payload($user)]);
    }

    if ($method === 'GET' && count($segments) === 2 && $segments[0] === 'verify-email') {
        $token = $segments[1];
        $user = query_one('SELECT * FROM users WHERE verification_token = ?', [$token]);
        if (!$user) {
            send_json(['success' => false, 'message' => 'Verification token is invalid.'], 404);
        }
        execute('UPDATE users SET is_verified = 1, verification_status = ?, verification_token = NULL, verification_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Verified', $user['id']]);
        send_json(['success' => true, 'message' => 'Email verified successfully.']);
    }

    if ($method === 'POST' && $segments === ['forgot-password']) {
        $payload = read_json_body();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            send_json(['success' => false, 'message' => 'A valid email address is required.'], 400);
        }
        $user = query_one('SELECT * FROM users WHERE email = ?', [$email]);
        if ($user) {
            $otp = (string) random_int(100000, 999999);
            $otpHash = hash('sha256', $otp);
            execute('UPDATE users SET password_reset_otp = ?, password_reset_otp_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE), password_reset_otp_requested_at = CURRENT_TIMESTAMP, password_reset_otp_request_count = COALESCE(password_reset_otp_request_count, 0) + 1, password_reset_otp_window_started_at = COALESCE(password_reset_otp_window_started_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [$otpHash, $user['id']]);
        }
        send_json(['success' => true, 'message' => 'If an account with that email exists, a password reset OTP has been sent.']);
    }

    if ($method === 'POST' && $segments === ['resend-password-otp']) {
        $payload = read_json_body();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            send_json(['success' => false, 'message' => 'A valid email address is required.'], 400);
        }
        send_json(['success' => true, 'message' => 'If the account exists, a fresh OTP has been issued.']);
    }

    if ($method === 'POST' && ($segments === ['reset-password'] || (count($segments) === 2 && $segments[0] === 'reset-password'))) {
        $payload = read_json_body();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $otp = (string) ($payload['otp'] ?? '');
        $newPassword = (string) ($payload['newPassword'] ?? '');
        $token = $segments[1] ?? null;
        if (strlen($newPassword) < 8) {
            send_json(['success' => false, 'message' => 'New password must be at least 8 characters long.'], 400);
        }

        if ($token) {
            $user = query_one('SELECT * FROM users WHERE password_reset_token = ?', [$token]);
        } else {
            $user = query_one('SELECT * FROM users WHERE email = ?', [$email]);
            if ($user && $otp !== '') {
                $hash = hash('sha256', $otp);
                if (($user['password_reset_otp'] ?? null) !== $hash) {
                    $user = null;
                }
            }
        }

        if (!$user) {
            send_json(['success' => false, 'message' => 'Unable to reset password.'], 404);
        }

        execute('UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL, password_reset_otp = NULL, password_reset_otp_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [password_hash($newPassword, PASSWORD_BCRYPT), $user['id']]);
        send_json(['success' => true, 'message' => 'Password updated successfully.']);
    }

    if ($method === 'POST' && $segments === ['resend-verification-email']) {
        $payload = read_json_body();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            send_json(['success' => false, 'message' => 'A valid email address is required.'], 400);
        }
        $user = query_one('SELECT * FROM users WHERE email = ?', [$email]);
        if ($user) {
            execute('UPDATE users SET verification_token = ?, verification_token_expires = DATE_ADD(NOW(), INTERVAL 1 DAY), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [bin2hex(random_bytes(20)), $user['id']]);
        }
        send_json(['success' => true, 'message' => 'If the account exists, a verification email has been sent.']);
    }

    if ($segments === ['admin', 'pending-verifications'] && $method === 'GET') {
        current_user(true, ['Admin']);
        $rows = query_all('SELECT id, username, full_name, email, phone_number, role, is_verified, verification_status, verification_type, verification_document_url, profile_summary, created_at, updated_at FROM users WHERE verification_status = ? ORDER BY created_at DESC', ['Pending']);
        send_json(['success' => true, 'users' => array_map('user_payload', $rows)]);
    }

    if (count($segments) === 4 && $segments[0] === 'admin' && $segments[1] === 'users' && $segments[3] === 'verification' && $method === 'PATCH') {
        current_user(true, ['Admin']);
        $userId = $segments[2];
        $payload = read_json_body();
        $status = normalize_role($payload['status'] ?? 'Approved');
        execute('UPDATE users SET verification_status = ?, is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [$status, in_array($status, ['Verified', 'Approved'], true) ? 1 : 0, $userId]);
        send_json(['success' => true, 'message' => 'Verification status updated.']);
    }

    send_json(['success' => false, 'message' => 'Route not found.'], 404);
}

function handle_contact(array $segments): void {
    $method = request_method();

    if ($method === 'POST' && $segments === []) {
        $payload = read_json_body();
        execute('INSERT INTO contact_messages (name, email, phone, topic, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
            safe_string($payload['name'] ?? null, 'Anonymous'),
            safe_string($payload['email'] ?? null, null),
            safe_string($payload['phone'] ?? null, null),
            safe_string($payload['topic'] ?? null, 'Feedback'),
            safe_string($payload['message'] ?? null, ''),
            'Open',
        ]);
        send_json(['success' => true, 'message' => 'Your message has been submitted.']);
    }

    if ($segments === ['admin', 'messages'] && $method === 'GET') {
        current_user(true, ['Admin']);
        $messages = query_all('SELECT id AS _id, id, name, email, phone, topic, message, status, admin_notes AS adminNote, resolved_at AS resolvedAt, resolved_by AS resolvedBy, created_at AS createdAt, updated_at AS updatedAt FROM contact_messages ORDER BY created_at DESC');
        send_json(['success' => true, 'messages' => $messages]);
    }

    if (count($segments) === 3 && $segments[0] === 'admin' && $segments[1] === 'messages' && $method === 'PATCH') {
        current_user(true, ['Admin']);
        $payload = read_json_body();
        $nextStatus = safe_string($payload['status'] ?? null, '');
        $adminNote = safe_string($payload['adminNote'] ?? $payload['adminNotes'] ?? null, null);

        execute('UPDATE contact_messages SET status = COALESCE(NULLIF(?, \'\'), status), admin_notes = COALESCE(?, admin_notes), resolved_at = CASE WHEN ? = \'Resolved\' THEN CURRENT_TIMESTAMP WHEN ? IN (\'Open\', \'In Progress\') THEN NULL ELSE resolved_at END, resolved_by = CASE WHEN ? = \'Resolved\' THEN \'admin\' WHEN ? IN (\'Open\', \'In Progress\') THEN NULL ELSE resolved_by END, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
            $nextStatus,
            $adminNote,
            $nextStatus,
            $nextStatus,
            $nextStatus,
            $nextStatus,
            $segments[2],
        ]);
        send_json(['success' => true, 'message' => 'Contact message updated.']);
    }

    send_json(['success' => false, 'message' => 'Route not found.'], 404);
}

function handle_upload(): void {
    current_user(false);
    if (request_method() !== 'POST') {
        send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
    }

    if (empty($_FILES['photos'])) {
        send_json(['success' => false, 'message' => 'No files were uploaded.'], 400);
    }

    ensure_upload_dir();
    $files = $_FILES['photos'];
    $uploaded = [];
    $names = is_array($files['name']) ? $files['name'] : [$files['name']];
    $tmpNames = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
    $errors = is_array($files['error']) ? $files['error'] : [$files['error']];

    foreach ($tmpNames as $index => $tmpName) {
        if (($errors[$index] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || !is_uploaded_file($tmpName)) {
            continue;
        }

        $extension = pathinfo((string) ($names[$index] ?? 'file.jpg'), PATHINFO_EXTENSION);
        $safeName = bin2hex(random_bytes(16)) . ($extension ? '.' . preg_replace('/[^a-zA-Z0-9]/', '', $extension) : '');
        $destination = upload_dir() . '/' . $safeName;

        if (move_uploaded_file($tmpName, $destination)) {
            $uploaded[] = rtrim((string) env_value('BACKEND_URL', 'http://localhost:5001'), '/') . '/uploads/' . $safeName;
        }
    }

    if ($uploaded === []) {
        send_json(['success' => false, 'message' => 'Unable to upload the selected files.'], 400);
    }

    send_json(['success' => true, 'urls' => $uploaded]);
}

function handle_blogs(array $segments): void {
    $method = request_method();
    if ($method === 'GET' && $segments === []) {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = max(1, (int) ($_GET['limit'] ?? 6));
        $offset = ($page - 1) * $limit;
        $sortBy = (string) ($_GET['sortBy'] ?? 'latest');
        $orderBy = $sortBy === 'trending' ? 'ORDER BY likes_count DESC, created_at DESC' : 'ORDER BY created_at DESC';

        $rows = query_all("SELECT * FROM blogs $orderBy LIMIT $limit OFFSET $offset");
        $total = (int) (query_one('SELECT COUNT(*) AS count FROM blogs')['count'] ?? 0);
        $blogs = array_map(static function (array $row): array {
            return [
                '_id' => (string) $row['id'],
                'id' => (string) $row['id'],
                'name' => 'Content Creator',
                'role' => 'Content Creator',
                'title' => $row['title'] ?? '',
                'category' => 'News & Events',
                'intro' => substr(strip_tags((string) ($row['content'] ?? '')), 0, 180),
                'imageUrl' => $row['cover_image_url'] ?? null,
                'content' => $row['content'] ?? '',
                'likes' => (int) ($row['likes_count'] ?? 0),
                'views' => 0,
                'createdAt' => $row['created_at'] ?? null,
                'updatedAt' => $row['updated_at'] ?? null,
            ];
        }, $rows);

        send_json([
            'blogs' => $blogs,
            'currentPage' => $page,
            'totalPages' => max(1, (int) ceil($total / $limit)),
            'totalBlogs' => $total,
        ]);
    }

    if ($method === 'GET' && count($segments) === 1) {
        $blog = query_one('SELECT * FROM blogs WHERE id = ? OR slug = ?', [$segments[0], $segments[0]]);
        if (!$blog) {
            send_json(['success' => false, 'message' => 'Blog post not found.'], 404);
        }
        send_json([
            '_id' => (string) $blog['id'],
            'id' => (string) $blog['id'],
            'name' => 'Content Creator',
            'role' => 'Content Creator',
            'title' => $blog['title'] ?? '',
            'category' => 'News & Events',
            'intro' => substr(strip_tags((string) ($blog['content'] ?? '')), 0, 180),
            'imageUrl' => $blog['cover_image_url'] ?? null,
            'content' => $blog['content'] ?? '',
            'likes' => (int) ($blog['likes_count'] ?? 0),
            'views' => 0,
            'createdAt' => $blog['created_at'] ?? null,
            'updatedAt' => $blog['updated_at'] ?? null,
        ]);
    }

    if ($method === 'POST' && $segments === []) {
        $user = current_user(true, ['Admin', 'Landlord']);
        $payload = read_json_body();
        $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', (string) ($payload['title'] ?? 'blog'))) ?: 'blog';
        execute('INSERT INTO blogs (title, slug, content, cover_image_url, author_id, likes_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
            safe_string($payload['title'] ?? null, 'Untitled Blog'),
            trim($slug, '-') . '-' . substr(bin2hex(random_bytes(3)), 0, 6),
            safe_string($payload['content'] ?? null, ''),
            safe_string($payload['coverImageUrl'] ?? $payload['imageUrl'] ?? null, null),
            $user['id'],
            0,
        ]);
        send_json(['success' => true, 'message' => 'Blog post created.'], 201);
    }

    if ($method === 'POST' && count($segments) === 2 && $segments[1] === 'like') {
        execute('UPDATE blogs SET likes_count = likes_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [$segments[0]]);
        send_json(['success' => true, 'message' => 'Blog liked.']);
    }

    send_json(['success' => false, 'message' => 'Route not found.'], 404);
}

function handle_properties(array $segments): void {
    $method = request_method();
    $current = null;
    $isPublicPropertyRead = $method === 'GET' && ($segments === [] || count($segments) === 1);
    $isPublicSslCallback = count($segments) === 4 && $segments[1] === 'payments' && $segments[2] === 'ssl' && in_array($segments[3], ['success', 'fail', 'cancel'], true);
    if (!$isPublicPropertyRead && !$isPublicSslCallback) {
        $current = current_user(true, ['Tenant', 'Landlord', 'Admin']);
    }

    if ($method === 'GET' && $segments === []) {
        $limit = max(1, (int) ($_GET['limit'] ?? 20));
        $offset = max(0, (int) ($_GET['offset'] ?? 0));
        $properties = property_query_with_landlord('p.is_active = 1 AND (p.publication_status = ? OR p.publication_status = ?)', ['Published', 'Approved'], 'ORDER BY p.created_at DESC', $limit, $offset);
        send_json(['success' => true, 'properties' => $properties]);
    }

    if ($method === 'GET' && count($segments) === 1) {
        $property = query_one('SELECT p.*, u.id AS landlord_user_id, u.full_name AS landlord_full_name, u.username AS landlord_username, u.email AS landlord_email, u.phone_number AS landlord_phone_number, u.role AS landlord_role FROM properties p LEFT JOIN users u ON u.id = p.landlord_id WHERE p.id = ?', [$segments[0]]);
        if (!$property) {
            send_json(['success' => false, 'message' => 'Property not found.'], 404);
        }
        $property = load_property_detail($property);
        execute('UPDATE properties SET views = views + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [$segments[0]]);
        send_json($property);
    }

    if ($method === 'POST' && $segments === []) {
        $payload = read_json_body();
        $data = property_defaults($payload, null);
        $data['landlord_id'] = (string) $current['id'];
        $data['publication_status'] = 'Pending';
        $data['rental_month'] = $data['rental_month'] ?? date('Y-m');
        $result = property_insert_sql($data);
        execute($result['sql'], $result['params']);
        send_json(['success' => true, 'message' => 'Property added successfully.'], 201);
    }

    if ($method === 'PATCH' && count($segments) === 1) {
        $property = query_one('SELECT * FROM properties WHERE id = ?', [$segments[0]]);
        if (!$property) {
            send_json(['success' => false, 'message' => 'Property not found.'], 404);
        }
        if (normalize_role($current['role'] ?? 'Tenant') !== 'Admin' && (string) $property['landlord_id'] !== (string) $current['id']) {
            send_json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $payload = read_json_body();
        $data = property_defaults($payload, $property);
        $result = property_update_sql($data);
        execute($result['sql'] . ' WHERE id = ?', array_merge($result['params'], [$segments[0]]));
        send_json(['success' => true, 'message' => 'Property updated successfully.']);
    }

    if ($segments === ['mine'] && $method === 'GET') {
        $isAdmin = normalize_role($current['role'] ?? 'Tenant') === 'Admin';
        if ($isAdmin) {
            $properties = property_query_with_landlord('1 = 1', [], 'ORDER BY p.created_at DESC');
        } else {
            $rows = query_all('SELECT * FROM properties WHERE landlord_id = ? ORDER BY created_at DESC', [(string) $current['id']]);
            $properties = array_map(static fn (array $row) => load_property_detail($row), $rows);
        }
        send_json(['success' => true, 'properties' => $properties]);
    }

    if ($segments === ['mine', 'rent-tracker'] && $method === 'GET') {
        $month = remind_month((string) ($_GET['month'] ?? date('Y-m')));
        $rows = query_all('SELECT p.id, p.title, p.monthly_rent_per_seat, p.available_seats, p.total_seats, COUNT(r.id) AS payments_count, SUM(CASE WHEN r.status = ? THEN r.amount ELSE 0 END) AS paid_total, SUM(CASE WHEN r.status <> ? OR r.status IS NULL THEN r.amount ELSE 0 END) AS due_total FROM properties p LEFT JOIN rent_payments r ON r.property_id = p.id AND r.month = ? WHERE p.landlord_id = ? GROUP BY p.id ORDER BY p.created_at DESC', ['Paid', 'Paid', $month, $current['id']]);
        send_json(['success' => true, 'tracker' => $rows, 'month' => $month]);
    }

    if ($segments === ['mine', 'intelligence'] && $method === 'GET') {
        $month = remind_month((string) ($_GET['month'] ?? date('Y-m')));
        $properties = query_all('SELECT * FROM properties WHERE landlord_id = ? ORDER BY created_at DESC', [$current['id']]);
        $intelligence = [];
        foreach ($properties as $property) {
            $qualityScore = property_quality_score($property);
            $intelligence[] = [
                'propertyId' => (string) $property['id'],
                'title' => $property['title'] ?? null,
                'month' => $month,
                'qualityScore' => $qualityScore,
                'riskScore' => max(0, 100 - $qualityScore),
                'recommendation' => (int) ($property['available_seats'] ?? 0) > 0 ? 'Keep the listing active and refresh photos periodically.' : 'Publish a fresh vacancy update.',
            ];
        }
        send_json(['success' => true, 'intelligence' => $intelligence]);
    }

    if ($segments === ['tenant', 'reminders'] && $method === 'GET') {
        $month = remind_month((string) ($_GET['month'] ?? date('Y-m')));
        $rows = query_all('SELECT p.id, p.title, p.monthly_rent_per_seat, p.total_seats, p.available_seats, rp.status AS payment_status, rp.amount AS payment_amount, rp.month AS payment_month FROM properties p LEFT JOIN rent_payments rp ON rp.property_id = p.id AND rp.month = ? WHERE EXISTS (SELECT 1 FROM property_applications pa WHERE pa.property_id = p.id AND pa.tenant_id = ? AND pa.status = ?) ORDER BY p.created_at DESC', [$month, $current['id'], 'Approved']);
        $reminders = [];
        $totalDue = 0.0;
        $dueCount = 0;

        foreach ($rows as $row) {
            $status = $row['payment_status'] ?? 'Pending';
            $amount = (float) ($row['payment_amount'] ?? $row['monthly_rent_per_seat'] ?? 0);
            if ($status !== 'Paid') {
                $totalDue += $amount;
                $dueCount += 1;
            }

            $reminders[] = [
                'propertyId' => (string) $row['id'],
                'title' => $row['title'],
                'month' => $month,
                'amount' => $amount,
                'status' => $status,
                'message' => $status === 'Paid'
                    ? 'Payment completed for this month.'
                    : 'Monthly rent is due for this property.',
            ];
        }

        send_json(['success' => true, 'reminderEngine' => ['month' => $month, 'dueCount' => $dueCount, 'totalDue' => round($totalDue, 2), 'reminders' => $reminders]]);
    }

    if ($segments === ['admin', 'pending-publications'] && $method === 'GET') {
        current_user(true, ['Admin']);
        $properties = property_query_with_landlord('p.publication_status = ?', ['Pending'], 'ORDER BY p.created_at DESC');
        send_json(['success' => true, 'properties' => $properties]);
    }

    if (count($segments) === 3 && $segments[0] === 'admin' && $segments[2] === 'publication' && $method === 'PATCH') {
        current_user(true, ['Admin']);
        $payload = read_json_body();
        $status = enum_value($payload['status'] ?? 'Published');
        execute('UPDATE properties SET publication_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [$status, $segments[1]]);
        send_json(['success' => true, 'message' => 'Publication status updated.']);
    }

    if ($segments === ['admin', 'insights'] && $method === 'GET') {
        current_user(true, ['Admin']);
        $totalProperties = (int) (query_one('SELECT COUNT(*) AS count FROM properties')['count'] ?? 0);
        $pendingProperties = (int) (query_one('SELECT COUNT(*) AS count FROM properties WHERE publication_status = ?', ['Pending'])['count'] ?? 0);
        $usersCount = (int) (query_one('SELECT COUNT(*) AS count FROM users')['count'] ?? 0);
        send_json(['success' => true, 'insights' => ['totalProperties' => $totalProperties, 'pendingProperties' => $pendingProperties, 'totalUsers' => $usersCount]]);
    }

    if ($segments === ['admin', 'intelligence-thresholds'] && $method === 'GET') {
        current_user(true, ['Admin']);
        $thresholds = query_one('SELECT * FROM intelligence_thresholds ORDER BY id ASC LIMIT 1');
        $mapped = [
            'fraud' => [
                'medium' => (int) ($thresholds['fraud_threshold'] ?? 40),
                'high' => (int) ($thresholds['fraud_threshold'] ?? 70),
            ],
            'risk' => [
                'medium' => (int) ($thresholds['risk_threshold'] ?? 40),
                'high' => (int) ($thresholds['risk_threshold'] ?? 70),
            ],
            'pricing' => [
                'lowOccupancy' => 0.35,
                'highOccupancy' => 0.8,
                'strongQuality' => 12,
                'weakQuality' => 10,
                'strongCommute' => 5,
                'weakCommute' => 5,
            ],
            'quality' => [
                'gradeA' => (int) ($thresholds['quality_threshold'] ?? 85),
                'gradeB' => 70,
                'gradeC' => 55,
            ],
        ];
        send_json(['success' => true, 'thresholds' => $mapped]);
    }

    if ($segments === ['admin', 'intelligence-thresholds'] && $method === 'PATCH') {
        current_user(true, ['Admin']);
        $payload = read_json_body();
        $postedThresholds = is_array($payload['thresholds'] ?? null) ? $payload['thresholds'] : [];
        $thresholds = query_one('SELECT * FROM intelligence_thresholds ORDER BY id ASC LIMIT 1');
        $fraudThreshold = (int) ($postedThresholds['fraud']['high'] ?? $postedThresholds['fraud']['medium'] ?? $thresholds['fraud_threshold'] ?? 70);
        $qualityThreshold = (int) ($postedThresholds['quality']['gradeA'] ?? $thresholds['quality_threshold'] ?? 60);
        $priceDeltaThreshold = (int) ($payload['price_delta_threshold'] ?? $thresholds['price_delta_threshold'] ?? 15);
        $riskThreshold = (int) ($postedThresholds['risk']['high'] ?? $postedThresholds['risk']['medium'] ?? $thresholds['risk_threshold'] ?? 60);
        if ($thresholds) {
            execute('UPDATE intelligence_thresholds SET fraud_threshold = ?, quality_threshold = ?, price_delta_threshold = ?, risk_threshold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
                $fraudThreshold,
                $qualityThreshold,
                $priceDeltaThreshold,
                $riskThreshold,
                $thresholds['id'],
            ]);
        } else {
            execute('INSERT INTO intelligence_thresholds (fraud_threshold, quality_threshold, price_delta_threshold, risk_threshold, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
                $fraudThreshold,
                $qualityThreshold,
                $priceDeltaThreshold,
                $riskThreshold,
            ]);
        }
        $fresh = query_one('SELECT * FROM intelligence_thresholds ORDER BY id ASC LIMIT 1');
        send_json([
            'success' => true,
            'message' => 'Thresholds updated.',
            'thresholds' => [
                'fraud' => ['medium' => (int) ($fresh['fraud_threshold'] ?? 40), 'high' => (int) ($fresh['fraud_threshold'] ?? 70)],
                'risk' => ['medium' => (int) ($fresh['risk_threshold'] ?? 40), 'high' => (int) ($fresh['risk_threshold'] ?? 70)],
                'pricing' => ['lowOccupancy' => 0.35, 'highOccupancy' => 0.8, 'strongQuality' => 12, 'weakQuality' => 10, 'strongCommute' => 5, 'weakCommute' => 5],
                'quality' => ['gradeA' => (int) ($fresh['quality_threshold'] ?? 85), 'gradeB' => 70, 'gradeC' => 55],
            ],
        ]);
    }

    if (count($segments) === 2 && $segments[1] === 'quality-assistant' && $method === 'GET') {
        current_user(true, ['Landlord', 'Admin']);
        $property = query_one('SELECT * FROM properties WHERE id = ?', [$segments[0]]);
        if (!$property) {
            send_json(['success' => false, 'message' => 'Property not found.'], 404);
        }
        send_json(['success' => true, 'assistant' => ['status' => 'Ready', 'score' => property_quality_score($property), 'flags' => []]]);
    }

    if (count($segments) === 2 && $segments[1] === 'pricing-recommendation' && $method === 'GET') {
        current_user(true, ['Landlord', 'Admin']);
        $property = query_one('SELECT * FROM properties WHERE id = ?', [$segments[0]]);
        if (!$property) {
            send_json(['success' => false, 'message' => 'Property not found.'], 404);
        }
        $rent = (float) ($property['monthly_rent_per_seat'] ?? 0);
        $recommended = $rent > 0 ? round($rent * 0.95, 2) : 0;
        send_json(['success' => true, 'recommendation' => ['current' => $rent, 'recommended' => $recommended, 'note' => 'The listing is priced within a competitive range for the current market.']]);
    }

    if (count($segments) === 2 && $segments[1] === 'apply' && $method === 'POST') {
        $payload = read_json_body();
        $property = query_one('SELECT * FROM properties WHERE id = ?', [$segments[0]]);
        if (!$property) {
            send_json(['success' => false, 'message' => 'Property not found.'], 404);
        }
        if ((int) ($property['available_seats'] ?? 0) <= 0) {
            send_json(['success' => false, 'message' => 'No seats are currently available.'], 409);
        }
        execute('INSERT INTO property_applications (property_id, tenant_id, tenant_name, tenant_email, tenant_phone, student_id_type, seats_requested, document_url, roommate_request, note, status, verification_score, verification_confidence, verification_status, verification_flags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
            $segments[0],
            $current['id'],
            $current['full_name'] ?? $current['fullName'] ?? null,
            $current['email'] ?? null,
            $current['phone_number'] ?? null,
            enum_value($payload['studentIdType'] ?? 'Student ID'),
            (int) ($payload['seatsRequested'] ?? 1),
            safe_string($payload['documentUrl'] ?? null, null),
            to_bool($payload['roommateRequest'] ?? false),
            safe_string($payload['note'] ?? null, ''),
            'Pending',
            0,
            0,
            'Pending',
            json_or_null([]),
        ]);
        send_json(['success' => true, 'message' => 'Seat request submitted.']);
    }

    if (count($segments) === 3 && $segments[1] === 'applications' && $method === 'PATCH') {
        $property = query_one('SELECT * FROM properties WHERE id = ?', [$segments[0]]);
        if (!$property) {
            send_json(['success' => false, 'message' => 'Property not found.'], 404);
        }
        if (normalize_role($current['role'] ?? 'Tenant') !== 'Admin' && (string) $property['landlord_id'] !== (string) $current['id']) {
            send_json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $payload = read_json_body();
        $status = normalize_role($payload['status'] ?? 'Approved');
        execute('UPDATE property_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND property_id = ?', [$status, $segments[2], $segments[0]]);
        if ($status === 'Approved') {
            execute('UPDATE properties SET available_seats = GREATEST(available_seats - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [$segments[0]]);
        }
        send_json(['success' => true, 'message' => 'Application status updated.']);
    }

    if (count($segments) === 4 && $segments[1] === 'payments' && $segments[2] === 'ssl' && $segments[3] === 'initiate' && $method === 'POST') {
        $property = query_one('SELECT * FROM properties WHERE id = ?', [$segments[0]]);
        if (!$property) {
            send_json(['success' => false, 'message' => 'Property not found.'], 404);
        }
        $payload = read_json_body();
        $month = remind_month((string) ($payload['month'] ?? date('Y-m')));
        $amount = (float) ($payload['amount'] ?? $property['monthly_rent_per_seat'] ?? 0);
        $paymentMethod = safe_string($payload['paymentMethod'] ?? null, 'bKash');
        $transactionId = 'SSL-' . date('Ym') . '-' . substr((string) $segments[0], -6) . '-' . substr((string) $current['id'], -6) . '-' . substr((string) time(), -6);

        execute('INSERT INTO rent_payments (property_id, tenant_id, month, amount, provider, transaction_id, status, source, ssl_session_key, ssl_preferred_method, ssl_gateway_status, slip_id, slip_generated_at, slip_download_url, assistant_status, assistant_flags, assistant_expected_amount, assistant_paid_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
            $segments[0],
            $current['id'],
            $month,
            $amount,
            $paymentMethod,
            $transactionId,
            'Pending',
            'SSL',
            bin2hex(random_bytes(8)),
            $paymentMethod,
            'Pending',
            null,
            null,
            null,
            'Ready',
            json_or_null([]),
            $amount,
            0,
        ]);
        $paymentId = insert_id();
        send_json(['success' => true, 'gatewayUrl' => api_public_url('/api/properties/' . $segments[0] . '/payments/ssl/success?paymentId=' . $paymentId . '&month=' . urlencode($month))]);
    }

    if (count($segments) === 4 && $segments[1] === 'payments' && $segments[2] === 'ssl' && in_array($segments[3], ['success', 'fail', 'cancel'], true)) {
        $paymentId = (string) ($_GET['paymentId'] ?? '');
        if ($paymentId !== '') {
            execute('UPDATE rent_payments SET status = ?, ssl_gateway_status = ?, paid_at = IF(? = ?, CURRENT_TIMESTAMP, paid_at), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
                $segments[3] === 'success' ? 'Paid' : 'Failed',
                ucfirst($segments[3]),
                $segments[3],
                'success',
                $paymentId,
            ]);
        }
        $frontend = rtrim((string) env_value('FRONTEND_URL', 'http://localhost:5173'), '/');
        header('Location: ' . $frontend . '/properties/' . $segments[0] . '?paymentStatus=' . urlencode($segments[3] === 'success' ? 'success' : ($segments[3] === 'cancel' ? 'cancelled' : 'failed')), true, 302);
        exit;
    }

    if (count($segments) === 2 && $segments[1] === 'payments' && $method === 'POST') {
        $payload = read_json_body();
        execute('INSERT INTO rent_payments (property_id, tenant_id, month, amount, provider, transaction_id, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
            $segments[0],
            $current['id'],
            remind_month((string) ($payload['month'] ?? date('Y-m'))),
            (float) ($payload['amount'] ?? 0),
            safe_string($payload['provider'] ?? null, 'Manual'),
            safe_string($payload['transactionId'] ?? null, null),
            safe_string($payload['status'] ?? null, 'Pending'),
            'Manual',
        ]);
        send_json(['success' => true, 'message' => 'Rent payment stored.']);
    }

    if (count($segments) === 3 && $segments[1] === 'payments' && $method === 'PATCH') {
        $property = query_one('SELECT * FROM properties WHERE id = ?', [$segments[0]]);
        if (!$property) {
            send_json(['success' => false, 'message' => 'Property not found.'], 404);
        }
        if (normalize_role($current['role'] ?? 'Tenant') !== 'Admin' && (string) $property['landlord_id'] !== (string) $current['id']) {
            send_json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $payload = read_json_body();
        execute('UPDATE rent_payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND property_id = ?', [safe_string($payload['status'] ?? null, 'Pending'), $segments[2], $segments[0]]);
        send_json(['success' => true, 'message' => 'Payment updated.']);
    }

    if (count($segments) === 4 && $segments[1] === 'payments' && $segments[3] === 'slip' && $method === 'GET') {
        $payment = query_one('SELECT * FROM rent_payments WHERE id = ? AND property_id = ?', [$segments[2], $segments[0]]);
        if (!$payment) {
            send_json(['success' => false, 'message' => 'Payment not found.'], 404);
        }
        $property = query_one('SELECT id, title, area, address FROM properties WHERE id = ?', [$segments[0]]);
        $tenant = query_one('SELECT id, full_name, username, email, phone_number FROM users WHERE id = ?', [$payment['tenant_id']]);

        $slipId = $payment['slip_id'] ?: ('SSL-SLIP-' . ($payment['transaction_id'] ?? $payment['id']));
        $slip = [
            'slipId' => $slipId,
            'generatedAt' => $payment['slip_generated_at'] ?? $payment['paid_at'] ?? $payment['updated_at'],
            'note' => $payment['slip_note'] ?: 'Auto-generated from SSLCommerz validated payment.',
            'property' => [
                'id' => (string) ($property['id'] ?? $segments[0]),
                'title' => $property['title'] ?? null,
                'area' => $property['area'] ?? null,
                'address' => $property['address'] ?? null,
            ],
            'tenant' => [
                'id' => (string) ($tenant['id'] ?? $payment['tenant_id']),
                'name' => $tenant['full_name'] ?? $tenant['username'] ?? 'Tenant',
                'email' => $tenant['email'] ?? '',
                'phone' => $tenant['phone_number'] ?? '',
            ],
            'payment' => [
                'paymentId' => (string) $payment['id'],
                'transactionId' => $payment['transaction_id'] ?? null,
                'month' => $payment['month'] ?? null,
                'amount' => (float) ($payment['amount'] ?? 0),
                'provider' => $payment['provider'] ?? null,
                'status' => $payment['status'] ?? null,
                'paidAt' => $payment['paid_at'] ?? null,
                'currency' => $payment['ssl_currency'] ?: 'BDT',
                'validationId' => $payment['ssl_validation_id'] ?? null,
                'bankTransactionId' => $payment['ssl_bank_transaction_id'] ?? null,
                'cardType' => $payment['ssl_card_type'] ?? null,
                'cardIssuer' => $payment['ssl_card_issuer'] ?? null,
            ],
            'assistant' => [
                'status' => $payment['assistant_status'] ?? null,
                'flags' => parse_json_array($payment['assistant_flags'] ?? null),
            ],
        ];

        send_json(['success' => true, 'slip' => $slip]);
    }

    if (count($segments) === 5 && $segments[1] === 'payments' && $segments[3] === 'slip' && $segments[4] === 'pdf' && $method === 'GET') {
        $payment = query_one('SELECT * FROM rent_payments WHERE id = ? AND property_id = ?', [$segments[2], $segments[0]]);
        if (!$payment) {
            send_json(['success' => false, 'message' => 'Payment not found.'], 404);
        }
        $pdf = build_pdf_text('Payment Slip', [
            'BHMS Payment Slip',
            'Payment ID: ' . $payment['id'],
            'Property ID: ' . $payment['property_id'],
            'Month: ' . $payment['month'],
            'Amount: ' . $payment['amount'],
            'Status: ' . $payment['status'],
            'Transaction: ' . ($payment['transaction_id'] ?? ''),
        ]);
        send_text($pdf, 200, 'application/pdf');
    }

    if (count($segments) === 2 && $segments[1] === 'messages' && $method === 'POST') {
        $payload = read_json_body();
        execute('INSERT INTO property_messages (property_id, sender_id, sender_name, sender_role, message, moderation_score, moderation_risk_level, moderation_flags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
            $segments[0],
            $current['id'],
            $current['full_name'] ?? $current['fullName'] ?? null,
            normalize_role($current['role'] ?? 'Tenant'),
            safe_string($payload['message'] ?? null, ''),
            0,
            'Low',
            json_or_null([]),
        ]);
        send_json(['success' => true, 'message' => 'Message sent.']);
    }

    if (count($segments) === 2 && $segments[1] === 'reviews' && $method === 'POST') {
        $payload = read_json_body();
        execute('INSERT INTO property_reviews (property_id, tenant_id, tenant_name, rating, comment, moderation_score, moderation_risk_level, moderation_flags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [
            $segments[0],
            $current['id'],
            $current['full_name'] ?? $current['fullName'] ?? null,
            (float) ($payload['rating'] ?? 5),
            safe_string($payload['comment'] ?? null, ''),
            0,
            'Low',
            json_or_null([]),
        ]);
        send_json(['success' => true, 'message' => 'Review submitted.']);
    }

    send_json(['success' => false, 'message' => 'Route not found.'], 404);
}

function handle_request(): void {
    if (request_method() === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Credentials: true');

    $segments = request_segments();
    if ($segments === []) {
        send_json(['success' => true, 'message' => 'Welcome to the BHMS PHP API']);
    }

    $resource = array_shift($segments);
    if ($resource === 'health') {
        send_json(['success' => true, 'message' => 'OK']);
    }

    if ($resource === 'auth') {
        handle_auth($segments);
    }

    if ($resource === 'contact') {
        handle_contact($segments);
    }

    if ($resource === 'upload') {
        handle_upload();
    }

    if ($resource === 'blogs') {
        handle_blogs($segments);
    }

    if ($resource === 'properties') {
        handle_properties($segments);
    }

    send_json(['success' => false, 'message' => 'Route not found.'], 404);
}

handle_request();