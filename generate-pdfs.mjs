import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { join } from 'path';

const outDir = '.';

const FONT_PATH = 'C:\\Windows\\Fonts\\arial.ttf';
const FONT_BOLD_PATH = 'C:\\Windows\\Fonts\\arialbd.ttf';

function mdToPlainText(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .trim();
}

function writePdf(filename, title, sections) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = doc.pipe(createWriteStream(join(outDir, filename)));
  doc.registerFont('Arial', FONT_PATH);
  doc.registerFont('Arial-Bold', FONT_BOLD_PATH);

  doc.fontSize(20).font('Arial-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Arial').text('CloudDroid — RUNESTONE HANDLUNG s.r.o.', { align: 'center' });
  doc.text('Soukenická 877/9, Ostrava, 702 00, Czech Republic | IČO: 23389702 | DIČ: CZ23389702', { align: 'center' });
  doc.text('support@clouddroid.eu', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).text('Effective date: 23 August 2026. Last updated: 23 August 2026.', { align: 'center' });
  doc.moveDown(1.5);

  for (const section of sections) {
    doc.fontSize(14).font('Arial-Bold').text(section.heading);
    doc.moveDown(0.3);
    doc.fontSize(11).font('Arial');

    const lines = mdToPlainText(section.body).split('\n').filter(l => l.trim());
    for (const line of lines) {
      const text = line.trim();
      if (!text) continue;
      if (text.startsWith('• ')) {
        doc.text(text, { indent: 20 });
      } else {
        doc.text(text);
      }
    }
    doc.moveDown(0.8);
  }

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

const termsSections = [
  { heading: '1. Acceptance of Terms', body: 'By accessing or using CloudDroid\'s services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.' },
  { heading: '2. Description of Service', body: 'CloudDroid provides enterprise-grade cloud Android workspaces for QA automation, app testing, and secure remote productivity. Services are provided as one-time access purchases with various tiers as described on our Pricing page.' },
  { heading: '3. Acceptable Use Policy', body: `You agree not to use CloudDroid services for any unlawful purpose or any purpose prohibited under this section. The following activities are strictly prohibited:

3.1 Network Abuse
• Distributed Denial of Service (DDoS) attacks
• Port scanning or network reconnaissance
• Spamming (email, SMS, or other messaging platforms)
• Unauthorized access to systems or networks

3.2 Resource Abuse
• Cryptocurrency mining or blockchain-related computational activities
• Continuous 100% CPU utilization scripts or processes
• Any activity that materially degrades service performance for other users
• Unauthorized sharing of resources with third parties

3.3 Fraudulent Activity
• Click-fraud or ad-abuse schemes
• Card testing or payment fraud
• Identity theft or impersonation
• Any activity designed to manipulate or abuse our billing system

3.4 Consequences of Violation
Violation of this Acceptable Use Policy will result in immediate termination of your instance without a refund. CloudDroid reserves the right to report violations to law enforcement authorities.` },
  { heading: '4. User Responsibilities', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify CloudDroid immediately of any unauthorized use of your account.' },
  { heading: '5. Payment Terms', body: `Access fees are paid as one-time payments. All fees are non-refundable except as expressly set forth in our Refund Policy. CloudDroid reserves the right to change pricing with 30 days' notice.

Access Period
Access is granted per purchase for the selected plan tier. You will have access until the end of the purchased period. Extend access by purchasing again.

Expiration
Access expires at the end of the purchased period. There is no automatic renewal. You will continue to have access to your instance until the end of the paid period.

Non-Payment
If payment fails, we will retry the payment. If payment remains outstanding for 7 days, your instance may be suspended. After 14 days of non-payment, your instance may be terminated and data deleted.

Chargebacks
In the event of a chargeback, we reserve the right to suspend or terminate your account and may pursue collection of the disputed amount. Chargebacks may also result in being banned from using CloudDroid services in the future.

Payment Processing and PCI DSS
CloudDroid does not store, process, or transmit raw credit or debit card data. All payment information is processed directly by our PCI DSS compliant payment processors, Dodo Payments and Mollie. CloudDroid's systems handle only payment tokens and metadata, never raw card data.` },
  { heading: '6. Service Level Agreement', body: 'Professional and Team plans include a 99.9% uptime SLA. Service credits are available for qualifying downtime as described in the SLA documentation.' },
  { heading: '7. Limitation of Liability', body: 'CloudDroid shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill.' },
  { heading: '8. Governing Law', body: 'These terms shall be governed by and construed in accordance with the laws of the Czech Republic, without regard to its conflict of law provisions.' },
  { heading: '9. Contact Information', body: `For questions about these Terms of Service, please contact us at:

CloudDroid
RUNESTONE HANDLUNG s.r.o.
Soukenická 877/9
Ostrava, 702 00
Czech Republic
IČO: 23389702
DIČ: CZ23389702
support@clouddroid.eu` },
];

const privacySections = [
  { heading: '1. Introduction', body: `CloudDroid ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cloud Android workspace services.

The data controller is RUNESTONE HANDLUNG s.r.o., IČO 23389702, Soukenická 877/9, Ostrava, 702 00, Czech Republic. For privacy-related inquiries, you may also contact our Data Protection Officer at dpo@clouddroid.eu.` },
  { heading: '2. Information We Collect', body: `2.1 Personal Information
• Name, email address, and contact information
• Company name and job title (for business accounts)
• Payment information (processed securely by our payment processor)
• Account credentials and authentication data

2.2 Usage Data
• Instance usage metrics (CPU, memory, storage)
• Access logs and connection timestamps
• API usage and integration activity` },
  { heading: '3. How We Use Your Information', body: `• To provide and maintain our services
• To process payments and send billing information
• To communicate with you about service updates and support
• To improve our services and develop new features
• To detect and prevent fraud, abuse, and security incidents
• To comply with legal obligations` },
  { heading: '4. Data Security', body: 'CloudDroid does not store raw credit card data. All payment information is processed securely by our payment processors, Dodo Payments and Mollie, using industry-standard encryption. We implement TLS 1.3 for all web traffic and AES-256 encryption for data at rest.' },
  { heading: '5. Data Retention', body: 'We retain your personal information for as long as your account is active or as needed to provide you with our services. After account deletion, we will retain certain data as required by law or for legitimate business purposes (e.g., accounting records, fraud prevention). You may request deletion of your personal data by contacting support@clouddroid.eu.' },
  { heading: '6. Your Rights (GDPR & CCPA)', body: `Depending on your location, you may have the following rights:

• Access: Request a copy of your personal data
• Rectification: Request correction of inaccurate data
• Erasure: Request deletion of your personal data
• Portability: Request transfer of your data to another service
• Objection: Object to processing of your personal data` },
  { heading: '7. Cookies and Tracking', body: 'We use essential cookies to operate our service. We do not use tracking cookies for advertising purposes without your consent.' },
  { heading: '8. Third-Party Services', body: 'Our services integrate with third-party tools (CI/CD platforms, monitoring services). These services have their own privacy policies, and we encourage you to review them.' },
  { heading: '9. Data Breach Notification', body: 'In the event of a data breach that affects your personal information, we will notify you and relevant authorities as required by applicable law within 72 hours.' },
  { heading: '10. Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.' },
  { heading: '11. Contact Us', body: `If you have questions about this Privacy Policy, please contact us at:

CloudDroid
RUNESTONE HANDLUNG s.r.o.
Soukenická 877/9
Ostrava, 702 00
Czech Republic
IČO: 23389702
DIČ: CZ23389702
support@clouddroid.eu
dpo@clouddroid.eu (Data Protection Officer)` },
];

const returnSections = [
  { heading: '1. 14-Day Money-Back Guarantee', body: `We offer a 14-day money-back guarantee for all new purchases. If you are not satisfied with our service within the first 14 days of your initial purchase, you may request a full refund. This guarantee applies to one-time access purchases.

• Refund requests must be submitted within 14 days of the purchase date
• Refunds are processed within 5-10 business days
• The 14-day guarantee applies only to the initial purchase, not to extensions
• To request a refund, contact support@clouddroid.eu with your account email and purchase details` },
  { heading: '2. Digital Goods and Cloud Resources', body: 'After the 14-day guarantee period, CloudDroid provisions dedicated cloud resources upon purchase. As such, our services are considered digital goods. Once a cloud Android workspace has been deployed and made available to you, the resource has been consumed and cannot be returned.' },
  { heading: '3. No Refund Policy for Active Billing Cycles', body: `After the 14-day guarantee period, CloudDroid does not offer partial or full refunds for active billing cycles once the instance has been deployed. This policy is in place because:

• Cloud resources are provisioned immediately upon purchase
• Resources are reserved exclusively for your use
• Operational costs are incurred from the moment of deployment` },
  { heading: '4. Access Period', body: 'Access is granted for the purchased period. There is no automatic renewal. You will continue to have access to your instance until the end of the paid period. Extend access by purchasing again.' },
  { heading: '5. Service Interruptions', body: 'In the event of a service interruption caused by CloudDroid\'s infrastructure, we will provide service credits as outlined in our Service Level Agreement. Service credits are not refunds and can only be applied to future purchases.' },
  { heading: '6. Account Termination for Policy Violations', body: 'Accounts terminated for violation of our Terms of Service or Acceptable Use Policy are not eligible for refunds of any kind.' },
  { heading: '7. Billing Errors', body: 'If you believe you have been charged in error, please contact support@clouddroid.eu within 30 days of the charge. We will investigate and, if an error is confirmed, provide a credit to your account.' },
  { heading: '8. Chargebacks', body: 'In the event of a chargeback, we reserve the right to suspend or terminate your account and may pursue collection of the disputed amount. Chargebacks may also result in being banned from using CloudDroid services in the future.' },
  { heading: '9. Contact Information', body: `For questions about this Refund Policy, please contact us at:

CloudDroid
RUNESTONE HANDLUNG s.r.o.
Soukenická 877/9
Ostrava, 702 00
Czech Republic
IČO: 23389702
DIČ: CZ23389702
support@clouddroid.eu` },
];

const eulaSections = [
  { heading: '1. License Grant', body: `CloudDroid grants you a limited, non-exclusive, non-transferable, revocable license to use the CloudDroid software and services for your internal business or personal use, subject to the terms of this End User License Agreement ("EULA").

This license does not allow you to: (a) copy, modify, or create derivative works of the software; (b) reverse engineer, decompile, or disassemble the software; (c) distribute, sublicense, or transfer the software to any third party; or (d) use the software for any unlawful or prohibited purpose.` },
  { heading: '2. Intellectual Property', body: 'All rights, title, and interest in and to the CloudDroid software, including all intellectual property rights, are and shall remain the exclusive property of RUNESTONE HANDLUNG s.r.o. This EULA does not convey any ownership rights in the software.' },
  { heading: '3. Acceptable Use', body: `You agree to use the CloudDroid software and services in compliance with all applicable laws and regulations and in accordance with our Terms of Service and Acceptable Use Policy. Prohibited activities include, but are not limited to:

• Unauthorized copying or distribution of the software
• Reverse engineering or attempting to extract source code
• Using the software to develop a competing product
• Removing or altering any proprietary notices or labels
• Using the software for any illegal or fraudulent purpose` },
  { heading: '4. Data and Privacy', body: 'Your use of the CloudDroid software is also governed by our Privacy Policy. CloudDroid does not store raw credit card data. All payment information is processed securely by our payment processors, Dodo Payments and Mollie, using industry-standard encryption.' },
  { heading: '5. Disclaimer of Warranties', body: 'THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. CLOUDDROID DOES NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.' },
  { heading: '6. Limitation of Liability', body: 'IN NO EVENT SHALL CLOUDDROID OR RUNESTONE HANDLUNG s.r.o. BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THE USE OF THE SOFTWARE.' },
  { heading: '7. Termination', body: 'This EULA is effective until terminated. Your rights under this EULA will terminate automatically without notice if you fail to comply with any of its terms. Upon termination, you must cease all use of the software and destroy all copies in your possession or control.' },
  { heading: '8. Governing Law', body: 'This EULA shall be governed by and construed in accordance with the laws of the Czech Republic, without regard to its conflict of law provisions.' },
  { heading: '9. Contact Information', body: `For questions about this EULA, please contact us at:

CloudDroid
RUNESTONE HANDLUNG s.r.o.
Soukenická 877/9
Ostrava, 702 00
Czech Republic
IČO: 23389702
DIČ: CZ23389702
support@clouddroid.eu` },
];

await writePdf('Terms_of_Service.pdf', 'Terms of Service', termsSections);
await writePdf('Privacy_Policy.pdf', 'Privacy Policy', privacySections);
await writePdf('Return_Policy.pdf', 'Return Policy', returnSections);
await writePdf('EULA.pdf', 'End User License Agreement (EULA)', eulaSections);

console.log('PDFs generated successfully.');
