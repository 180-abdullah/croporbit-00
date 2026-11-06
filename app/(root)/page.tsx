// Static hosting has no server redirect, so the root page sends visitors to the default language (English).
// A visitor who chose Bangla earlier (saved in this browser) is sent to the Bangla pages instead.
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const pick = `try{if(localStorage.getItem("croporbit.lang")==="bn")location.replace(${JSON.stringify(`${base}/bn/`)})}catch(e){}`;
export default function Root() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: pick }} />
      <meta httpEquiv="refresh" content={`0; url=${base}/en/`} />
      <p style={{ padding: 24 }}>
        <a href={`${base}/en/`}>English</a> · <a href={`${base}/bn/`}>বাংলা</a>
      </p>
    </>
  );
}
