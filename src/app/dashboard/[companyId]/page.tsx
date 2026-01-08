import { headers } from 'next/headers';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: {
        companyId: string;
    };
}

/**
 * Dashboard page that receives companyId from URL path.
 * Whop loads apps at /dashboard/[companyId] format.
 */
export default function DashboardPage({ params }: PageProps) {
    const { companyId } = params;
    const headersList = headers();
    const token = headersList.get('x-whop-user-token') || '';

    console.log('[Dashboard] Loaded with companyId from URL:', companyId);
    console.log('[Dashboard] Token present:', token ? 'YES' : 'NO');

    return (
        <>
            {/* Inject companyId and token into window for client-side API calls */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
            window.__WHOP_COMPANY_ID__ = ${JSON.stringify(companyId)};
            window.__WHOP_TOKEN__ = ${JSON.stringify(token)};
          `,
                }}
            />
            <DashboardClient companyId={companyId} />
        </>
    );
}
