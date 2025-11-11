import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import CitySelector from './CitySelector/CitySelector';
import './Layout.css';

const Layout = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMapPage = location.pathname === '/';

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate('/login');
  };

  const getRoleName = (role) => {
    const roles = {
      development: 'Разработчик',
      dispatcher: 'Диспетчер',
      plumber: 'Слесарь'
    };
    return roles[role] || role;
  };

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__header-content">
          <h1 className="layout__title">ARM система Диспетчер 1.0, г. Сарапула, Сарапульский водоканал</h1>
          <div className="layout__header-right">
            {isMapPage && <CitySelector />}
            <div className="layout__user-info">
              <span className="layout__user-name">{user?.name}</span>
              <span className="layout__user-role">({getRoleName(user?.role)})</span>
              <button onClick={handleLogout} className="layout__logout-button">
                Выйти
              </button>
            </div>
          </div>
        </div>
        <nav className="layout__nav">
          <a href="/" className="layout__nav-link">Карта</a>
          <a href="/applications" className="layout__nav-link">Заявки</a>
          <a href="/hydrants" className="layout__nav-link">Гидранты</a>
        </nav>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
      <footer className="layout__footer">
        <div className="layout__footer-content">
          <p className="layout__copyright">
            © {new Date().getFullYear()} ARM система Диспетчер 1.0, г. Сарапула, Сарапульский водоканал
          </p>
          <p className="layout__developer">
            Разработчик: Пономарев Александр
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

