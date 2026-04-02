import Image from 'next/image';
import { logoDataUri } from '@/lib/logo-data';

export function PortalLogo(props: { className?: string }) {
    return (
        <Image
            src={logoDataUri}
            alt="Portal Logo"
            width={96}
            height={96}
            unoptimized
            {...props}
        />
    );
}
