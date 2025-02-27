<?php
// Gestione dinamica del caricamento di autoload.php
if (file_exists(dirname(__DIR__, 5) . '/wp-load.php') || defined('ABSPATH')) {
    // Siamo su WordPress
    require_once dirname(__DIR__, 4) . '/plugins/easy-subscribe-dependency/vendor/autoload.php';
    define('LOG_FILE', dirname(__DIR__, 4) . '/debug.log');
    $dotenvPath = dirname(__DIR__, 4); // Percorso relativo per WordPress

    // Estrai il percorso dal URL corrente, se presente
    $pathSegments = explode("/", parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
    $wpPath = !empty($pathSegments[1]) ? "/" . $pathSegments[1] : ""; // "/wpgiovanni" o stringa vuota
    $redirect_post_login = $wpPath . '/manager?data=';
} else {
    // Siamo in ambiente PHP locale
    require_once dirname(__DIR__, 3) . '/vendor/autoload.php';
    define('LOG_FILE', dirname(__DIR__, 3) . '/app.log');
    $dotenvPath = dirname(__DIR__, 3); // Percorso relativo per ambiente locale
    $redirect_post_login = '/dist/templates/template-manager.php?data=';
}

// Carica le variabili d'ambiente
$dotenv = Dotenv\Dotenv::createImmutable($dotenvPath);
$dotenv->load();

use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Stripe\StripeClient;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Ramsey\Uuid\Uuid;

$stripeSecretKey = $_ENV['STRIPE_SECRET_KEY'];
$smtpHost = $_ENV['SMTP_HOST'];
$smtpUsername = $_ENV['SMTP_USERNAME'];
$smtpPassword = $_ENV['SMTP_PASSWORD'];
$smtpPort = $_ENV['SMTP_PORT'];

// Configura Monolog
$log = new Logger('stripe');
$log->pushHandler(new StreamHandler(LOG_FILE, Logger::DEBUG));

header('Content-Type: application/json');

// Ricevi input
$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$redirect_url = $data['redirect_url'] ?? '';

$log->info('-------------------------------------------------');
$log->info('Login Collaborator per', ['email' => $email]);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['error' => true, 'message' => 'Indirizzo email non valido.']);
    exit;
}

$stripe = new StripeClient($stripeSecretKey);

try {
    $log->info('Ricerca prodotti in Stripe per email', ['email' => $email]);

    // Query prodotti attivi
    $products = $stripe->products->search([
        'query' => "active:'true' AND -metadata['email_organizzatori']:'null'",
        'expand' => ['data'],
        'limit' => 100
    ]);    

    $log->info('Prodotti trovati, filtraggio per email_organizzatori');

    $matchingProducts = [];
    foreach ($products->data as $product) {
        $organizers = $product->metadata['email_organizzatori'] ?? '';

        // Prova a interpretare il nuovo formato JSON
        try {
            $organizerData = json_decode($organizers, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($organizerData)) {
                $emailsArray = array_map(fn($entry) => $entry['email'] ?? '', $organizerData);
                $log->info('Email Organizzatori (nuovo formato)', ['email' => $emailsArray]);
            } else {
                throw new Exception('Formato JSON non valido');
            }
        } catch (Exception $e) {
            $log->error('Errore nel parsing del JSON in email_organizzatori: ' . $e->getMessage(), ['data' => $organizers]);

            // Fallback al vecchio formato
            $emailsArray = preg_split('/[,\s;]+/', $organizers);
            $log->info('Email Organizzatori (vecchio formato)', ['email' => $emailsArray]);
        }

        if (in_array($email, $emailsArray)) {
            $matchingProducts[] = $product->id;
        }
    }

    if (!empty($matchingProducts)) {
        $productIdsString = implode(',', $matchingProducts);
        $sessionId = Uuid::uuid4()->toString();
        $expirationTime = time() + 86400; // Scadenza a 24 ore

        // Creazione della sessione su Stripe con email
        $log->info('Creazione sessione per email', ['email' => $email]);
        $stripe->apps->secrets->create([
            'name' => 'SESSION_ID',
            'payload' => $sessionId,
            'scope' => ['type' => 'user', 'user' => $email],
            'expires_at' => $expirationTime,
        ]);
        $log->info('SESSION_ID salvato su Stripe', ['session_id' => $sessionId, 'email' => $email]);

        $resetUrl = $redirect_url . $redirect_post_login . base64_encode("$productIdsString:$sessionId:$email");
        $log->info('Reset URL is '. $resetUrl);

        $templatePath = __DIR__ . '/../../email-templates/email-collaborators.html';
        $emailBody = file_exists($templatePath) ? file_get_contents($templatePath) : '';
        $emailBody = str_replace('{{RESET_URL}}', $resetUrl, $emailBody);

        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = $smtpHost;
            $mail->SMTPAuth = true;
            $mail->Username = $smtpUsername;
            $mail->Password = $smtpPassword;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port = $smtpPort;

            $mail->setFrom($smtpUsername, 'EasySubscribe');
            $mail->addAddress($email);

            $mail->isHTML(true);
            $mail->Subject = 'Access to the Organizer Portal';
            $mail->Body = $emailBody;

            $mail->send();
            $log->info('Email inviata con successo', ['email' => $email]);
            echo json_encode(['error' => false, 'message' => 'Email inviata con successo.', 'product_ids' => $productIdsString, 'session_id' => $sessionId, 'email' => $email]);
        } catch (Exception $e) {
            $log->error('Errore invio email: ' . $mail->ErrorInfo);
            echo json_encode(['error' => true, 'message' => 'Errore invio email: ' . $mail->ErrorInfo]);
        }
    } else {
        echo json_encode(['error' => true, 'message' => 'Nessun prodotto trovato per l\'email fornita.']);
    }
} catch (Exception $e) {
    $log->error('Errore durante la ricerca: ' . $e->getMessage());
    echo json_encode(['error' => true, 'message' => 'Errore durante la ricerca: ' . $e->getMessage()]);
}
