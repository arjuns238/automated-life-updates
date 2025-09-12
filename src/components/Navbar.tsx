import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="w-full bg-blue-50 shadow-md flex items-center justify-between px-8 py-4 fixed top-0 left-0 z-50 transition-colors duration-300">
      {/* Logo + Links */}
      <div className="flex items-center gap-8">
        <Link to="/" className="font-extrabold text-2xl text-blue-700 hover:text-blue-900 transition-colors duration-200">
          FriendSync
        </Link>
        <Link
          to="/home"
          className="text-base text-blue-600 hover:text-blue-800 transition-colors duration-200"
        >
          Home
        </Link>
        <Link
          to="/about"
          className="text-base text-blue-600 hover:text-blue-800 transition-colors duration-200"
        >
          About
        </Link>
        <Link
          to="/features"
          className="text-base text-blue-600 hover:text-blue-800 transition-colors duration-200"
        >
          Features
        </Link>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-blue-700 font-medium">{user.email}</span>
            <Button
              variant="default"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => navigate("/settings")}
            >
              Settings
            </Button>
          </>
        ) : (
          <Button
            variant="default"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => navigate("/sign-in")}
          >
            Login
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
