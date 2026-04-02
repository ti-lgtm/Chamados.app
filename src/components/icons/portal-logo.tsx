export function PortalLogo(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 42 42"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <rect width="42" height="42" rx="8" fill="currentColor" />
            <path
                d="M14 12H23C26.3137 12 29 14.6863 29 18C29 21.3137 26.3137 24 23 24H14V12Z"
                fill="white"
            />
            <path d="M14 24H20V30H14V24Z" fill="white" />
        </svg>
    );
}
