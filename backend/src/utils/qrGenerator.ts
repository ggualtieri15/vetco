const QRCode = require('qrcode');

export interface MedicationScheduleQR {
  scheduleId: string;
  medication: string;
  petName: string;
  veterinarian: string;
  clinic: string;
  instructions: string;
  frequency: string;
  dosage: string;
  startDate: string;
  endDate?: string;
}

export async function generateMedicationQR(scheduleData: MedicationScheduleQR): Promise<string> {
  try {
    // Create QR code data object
    const qrData = {
      type: 'VETCO_MEDICATION_SCHEDULE',
      version: '1.0',
      data: scheduleData
    };

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

export function parseQRCode(qrCodeData: string): MedicationScheduleQR | null {
  try {
    const parsed = JSON.parse(qrCodeData);
    
    if (parsed.type !== 'VETCO_MEDICATION_SCHEDULE') {
      throw new Error('Invalid QR code type');
    }

    return parsed.data;
  } catch (error) {
    console.error('Error parsing QR code:', error);
    return null;
  }
}
