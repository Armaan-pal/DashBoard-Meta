const Footer = () => {
  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200 mt-8">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
        <span>© {new Date().getFullYear()} GoGrowth. All rights reserved.</span>
        <span className="mt-2 sm:mt-0">
          Built for growth. Designed and Developed by{" "}
          <a
            href="https://gogrowth.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            GoGrowth
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;