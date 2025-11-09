import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  YMaps,
  Map as YandexMap,
  Placemark,
  Polyline,
} from "@pbe/react-yandex-maps";
import api from "../services/api";
import { authService } from "../services/auth";
import { getDefaultCity } from "../config/cities";
import MapClickModal from "../components/MapClickModal/MapClickModal";
import SidePanel from "../components/SidePanel/SidePanel";
import LayerObjectForm from "../components/LayerObjectForm/LayerObjectForm";
import WellValvesModal from "../components/WellValvesModal/WellValvesModal";
import PipeEditModal from "../components/PipeEditModal/PipeEditModal";
import "./MapPage.css";

const MapPage = () => {
  const [mapFeatures, setMapFeatures] = useState([]);
  const [applications, setApplications] = useState([]);
  const [hydrants, setHydrants] = useState([]);
  const [layerObjects, setLayerObjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showLayerObjectForm, setShowLayerObjectForm] = useState(false);
  const [showWellValvesModal, setShowWellValvesModal] = useState(false);
  const [selectedWell, setSelectedWell] = useState(null);
  const [showPipeEditModal, setShowPipeEditModal] = useState(false);
  const [selectedPipe, setSelectedPipe] = useState(null);
  const [clickedPosition, setClickedPosition] = useState(null);
  const [clickedAddress, setClickedAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState({
    layerType: null,
    objectType: null,
    isActive: false,
  });
  const [layerVisibility, setLayerVisibility] = useState({
    water: true,
    sewer: true,
    hydrants: false,
  });
  const [lineBuildingMode, setLineBuildingMode] = useState({
    isActive: false,
    layerType: null,
    startWell: null,
  });
  const [lineStartPoint, setLineStartPoint] = useState(null); // Начальная точка для построения линии
  const [hoveredLineId, setHoveredLineId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Состояние для диалога подтверждения удаления
  const deleteConfirmResolveRef = useRef(null); // Ref для хранения resolve функции Promise
  const defaultCity = getDefaultCity();
  const [center, setCenter] = useState(defaultCity.center);
  const [zoom, setZoom] = useState(defaultCity.zoom);
  const mapRef = useRef(null);
  const [ymapsInstance, setYmapsInstance] = useState(null);

  useEffect(() => {
    loadMapData();
  }, []);

  // Проверяем window.ymaps после загрузки компонента
  useEffect(() => {
    const checkYmaps = () => {
      if (window.ymaps && !ymapsInstance) {
        console.log("window.ymaps найден через useEffect:", window.ymaps);
        // Используем ready() для получения правильного API объекта
        if (typeof window.ymaps.ready === "function") {
          window.ymaps.ready().then(() => {
            setYmapsInstance(window.ymaps);
          });
        } else {
          setYmapsInstance(window.ymaps);
        }
        return true; // Найден, больше не проверяем
      }
      return false;
    };

    // Проверяем сразу
    if (checkYmaps()) {
      return; // Если найден сразу, выходим
    }

    // Проверяем периодически, но только если еще не найден
    const interval = setInterval(() => {
      if (checkYmaps()) {
        clearInterval(interval);
      }
    }, 500);

    // Очищаем интервал через 10 секунд
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [ymapsInstance]);

  // Обработчик изменения города
  useEffect(() => {
    const handleCityChange = (event) => {
      if (event.detail && event.detail.city) {
        const city = event.detail.city;
        setCenter(city.center);
        setZoom(city.zoom);
      }
    };

    window.addEventListener("cityChange", handleCityChange);
    return () => window.removeEventListener("cityChange", handleCityChange);
  }, []);

  // Отслеживание изменений зума карты
  useEffect(() => {
    const updateZoom = () => {
      try {
        if (mapRef.current && typeof mapRef.current.getZoom === "function") {
          const currentZoom = mapRef.current.getZoom();
          if (currentZoom !== undefined && currentZoom !== null) {
            setZoom((prevZoom) => {
              // Обновляем только если зум изменился значительно
              if (Math.abs(currentZoom - prevZoom) > 0.01) {
                console.log("Зум обновлен через интервал:", currentZoom);
                return currentZoom;
              }
              return prevZoom;
            });
          }
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    };

    // Обновляем зум периодически
    const interval = setInterval(updateZoom, 100);

    return () => clearInterval(interval);
  }, []);

  // Обработчик открытия модального окна задвижек
  useEffect(() => {
    const handleOpenWellValves = (event) => {
      if (event.detail && event.detail.wellId) {
        const well = layerObjects.find(
          (obj) => obj.id === event.detail.wellId && obj.object_type === "well"
        );
        if (well) {
          setSelectedWell(well);
          setShowWellValvesModal(true);
        }
      }
    };

    window.addEventListener("openWellValves", handleOpenWellValves);
    return () =>
      window.removeEventListener("openWellValves", handleOpenWellValves);
  }, [layerObjects]);

  // Обработчик создания заявки при клике на линию
  useEffect(() => {
    const handleCreateApplicationAtLine = async (event) => {
      // Запрещаем создание заявок, если активен режим создания объектов слоев
      if (addMode.isActive && addMode.objectType) {
        return;
      }

      if (event.detail && event.detail.lat && event.detail.lng) {
        const position = {
          lat: event.detail.lat,
          lng: event.detail.lng,
        };

        // Получаем адрес по координатам
        const address = await getAddressFromCoordinates(
          event.detail.lat,
          event.detail.lng
        );
        setClickedAddress(address);
        setClickedPosition(position);
        setShowModal(true);
      }
    };

    window.addEventListener(
      "createApplicationAtLine",
      handleCreateApplicationAtLine
    );
    return () =>
      window.removeEventListener(
        "createApplicationAtLine",
        handleCreateApplicationAtLine
      );
  }, [addMode]); // Добавляем addMode в зависимости

  // Обработчик редактирования трубы
  useEffect(() => {
    const handleEditPipe = (event) => {
      if (event.detail && event.detail.pipeId) {
        const pipe = layerObjects.find(
          (obj) => obj.id === event.detail.pipeId && obj.object_type === "line"
        );
        if (pipe) {
          setSelectedPipe(pipe);
          setShowPipeEditModal(true);
        }
      }
    };

    window.addEventListener("editPipe", handleEditPipe);
    return () => window.removeEventListener("editPipe", handleEditPipe);
  }, [layerObjects]);

  // Обработчик удаления объекта слоя (колодца, камеры, линии)
  useEffect(() => {
    const handleDeleteLayerObject = async (event) => {
      console.log("Событие удаления получено:", event);
      console.log("event.detail:", event.detail);
      console.log("event.detail?.objectId:", event.detail?.objectId);
      
      if (event.detail && event.detail.objectId) {
        // Преобразуем objectId в число для корректного сравнения
        const objectId = parseInt(event.detail.objectId, 10);
        console.log("Ищем объект с ID:", objectId, "тип:", typeof objectId);
        console.log("Все объекты:", layerObjects.map(obj => ({ id: obj.id, idType: typeof obj.id, type: obj.object_type })));
        
        // Используем строгое сравнение с преобразованием типов
        const object = layerObjects.find((obj) => Number(obj.id) === Number(objectId));

        if (!object) {
          console.error("Объект не найден в layerObjects:", objectId);
          alert("Объект не найден");
          return;
        }

        const objectName =
          object.object_type === "well"
            ? "Колодец"
            : object.object_type === "chamber"
            ? "Камера"
            : object.object_type === "line"
            ? "Линия"
            : "Объект";

        console.log("Показываем диалог подтверждения для:", objectName, "#", objectId);
        
        // Показываем модальное окно подтверждения
        const confirmed = await new Promise((resolve) => {
          deleteConfirmResolveRef.current = resolve;
          setDeleteConfirm({
            objectId,
            objectName,
          });
        });
        
        if (!confirmed) {
          console.log("Пользователь отменил удаление");
          return;
        }

        try {
          await api.delete(`/map/layers/objects/${objectId}`);
          alert(`${objectName} успешно удален`);
          await loadMapData();
        } catch (error) {
          console.error("Ошибка при удалении объекта:", error);
          const errorMessage =
            error.response?.data?.error || "Ошибка при удалении объекта";
          alert(errorMessage);
        }
      }
    };

    window.addEventListener("deleteLayerObject", handleDeleteLayerObject);
    return () =>
      window.removeEventListener("deleteLayerObject", handleDeleteLayerObject);
  }, [layerObjects]);

  // Обработчик вращения объектов
  useEffect(() => {
    const handleRotateObject = async (event) => {
      if (event.detail && event.detail.objectId) {
        const { objectId, currentAngle, direction } = event.detail;
        const object = layerObjects.find((obj) => obj.id === objectId);

        if (object) {
          const step = 15; // Шаг поворота в градусах
          const newAngle =
            direction === "left"
              ? (currentAngle - step + 360) % 360
              : (currentAngle + step) % 360;

          try {
            const updatedGeojson = {
              ...object.geojson,
              rotation: newAngle,
            };

            await api.put(`/map/layers/objects/${objectId}`, {
              geojson: updatedGeojson,
            });

            // Обновляем данные на карте
            await loadMapData();
          } catch (error) {
            console.error("Ошибка при обновлении угла поворота:", error);
            alert("Ошибка при сохранении угла поворота");
          }
        }
      }
    };

    window.addEventListener("rotateObject", handleRotateObject);
    return () => window.removeEventListener("rotateObject", handleRotateObject);
  }, [layerObjects]);

  const loadMapData = async () => {
    try {
      const [
        featuresResponse,
        applicationsResponse,
        hydrantsResponse,
        layerObjectsResponse,
      ] = await Promise.all([
        api.get("/map/features"),
        api.get("/applications"),
        api.get("/map/hydrants"),
        api.get("/map/layers/objects"),
      ]);

      const loadedApplications = applicationsResponse.data.applications || [];

      const appsWithCoords = loadedApplications.filter(
        (a) =>
          a.coordinates &&
          a.coordinates.lat != null &&
          a.coordinates.lng != null &&
          !isNaN(a.coordinates.lat) &&
          !isNaN(a.coordinates.lng)
      );

      if (loadedApplications.length > 0 && appsWithCoords.length === 0) {
        console.error(
          "ВНИМАНИЕ: Все заявки без координат!",
          loadedApplications
        );
      }

      const loadedFeatures = featuresResponse.data.features || [];
      setMapFeatures(loadedFeatures);
      setApplications(loadedApplications);
      setHydrants(hydrantsResponse.data.hydrants || []);
      const loadedLayerObjects = layerObjectsResponse.data.objects || [];
      setLayerObjects(loadedLayerObjects);
    } catch (error) {
      console.error("Error loading map data:", error);
      console.error("Error details:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (e) => {
    const user = authService.getUser();
    if (user && user.role === "director") {
      try {
        const coords = e.get ? e.get("coords") : e.originalEvent.coords;
        setClickedPosition({
          lat: coords[0],
          lng: coords[1],
        });
        setShowForm(true);
      } catch (error) {
        console.error("Ошибка обработки клика на карте:", error);
      }
    }
  };

  // Функция для получения адреса по координатам
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      if (!window.ymaps) {
        console.warn("Yandex Maps API не загружен");
        return null;
      }

      await window.ymaps.ready();

      if (typeof window.ymaps.geocode !== "function") {
        // Пробуем явно загрузить модуль
        try {
          await window.ymaps.load("package.full");
        } catch (loadError) {
          console.error("Ошибка загрузки модуля geocode:", loadError);
          return null;
        }
      }

      if (typeof window.ymaps.geocode !== "function") {
        console.warn("Геокодирование недоступно");
        return null;
      }

      // Обратное геокодирование: координаты -> адрес
      const result = await window.ymaps.geocode([lat, lng]);

      if (result.geoObjects.getLength() === 0) {
        return null;
      }

      const firstGeoObject = result.geoObjects.get(0);
      const address = firstGeoObject.getAddressLine();

      return address || null;
    } catch (error) {
      console.error("Ошибка при получении адреса:", error);
      return null;
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setClickedPosition(null);
    setClickedAddress(null);
  };

  const handleModalSubmit = async () => {
    await loadMapData();
    handleModalClose();
  };

  // Группировка заявок по координатам
  const groupApplicationsByLocation = (apps) => {
    const groups = new Map();
    const tolerance = 0.0001;

    const validApps = apps.filter((app) => {
      const hasValidCoords =
        app.coordinates &&
        app.coordinates.lat != null &&
        app.coordinates.lng != null &&
        !isNaN(app.coordinates.lat) &&
        !isNaN(app.coordinates.lng);

      if (!hasValidCoords) {
        // Заявка без координат пропускается
      }

      return hasValidCoords;
    });

    // Группировка заявок по координатам

    validApps.forEach((app) => {
      const key = `${Math.round(app.coordinates.lat / tolerance)}_${Math.round(
        app.coordinates.lng / tolerance
      )}`;

      if (!groups.has(key)) {
        groups.set(key, {
          lat: app.coordinates.lat,
          lng: app.coordinates.lng,
          applications: [],
          waterCount: 0,
          sewerCount: 0,
        });
      }

      const group = groups.get(key);
      group.applications.push(app);

      if (app.team) {
        if (app.team.name === "водосеть") {
          group.waterCount++;
        } else if (app.team.name === "канализация") {
          group.sewerCount++;
        }
      }
    });

    const result = Array.from(groups.values());
    // Группы заявок созданы
    return result;
  };

  // Получение цвета маркера для заявки
  const getApplicationColor = (app) => {
    if (app.status === "new" && !app.team) {
      return "#dc2626"; // Красный
    }

    if (app.team) {
      const isWater = app.team.name === "водосеть";
      const isInProgress = app.status === "in_progress";
      if (isWater) {
        return isInProgress ? "#0066ff" : "#0066cc"; // Ярко-синий или синий
      } else {
        return isInProgress ? "#facc15" : "#fbbf24"; // Ярко-желтый или желтый
      }
    }

    return "#dc2626"; // Красный по умолчанию
  };

  // Получение цвета маркера для группы заявок
  const getGroupColor = (group) => {
    const hasWater = group.waterCount > 0;
    const hasSewer = group.sewerCount > 0;

    const waterInProgress = group.applications.filter(
      (app) => app.team?.name === "водосеть" && app.status === "in_progress"
    ).length;
    const sewerInProgress = group.applications.filter(
      (app) => app.team?.name === "канализация" && app.status === "in_progress"
    ).length;
    const newWithoutTeam = group.applications.filter(
      (app) => app.status === "new" && !app.team
    ).length;

    if (hasWater && hasSewer) {
      if (waterInProgress > 0 || sewerInProgress > 0) {
        return waterInProgress > sewerInProgress ? "#0066ff" : "#facc15";
      }
      return "#0066cc";
    } else if (hasWater) {
      return waterInProgress > 0 ? "#0066ff" : "#0066cc";
    } else if (hasSewer) {
      return sewerInProgress > 0 ? "#facc15" : "#fbbf24";
    } else if (newWithoutTeam > 0) {
      return "#dc2626";
    }

    return "#dc2626";
  };

  // Создание содержимого балуна для заявки
  const createApplicationBalloon = (app) => {
    return `
      <div class="map-page__popup">
        <h3>Заявка #${app.id}</h3>
        <p><strong>Адрес:</strong> ${app.address}</p>
        <p><strong>Статус:</strong> ${app.status}</p>
        ${app.team ? `<p><strong>Бригада:</strong> ${app.team.name}</p>` : ""}
        ${
          app.description
            ? `<p><strong>Описание:</strong> ${app.description}</p>`
            : ""
        }
      </div>
    `;
  };

  // Создание содержимого балуна для группы заявок
  const createGroupBalloon = (group) => {
    return `
      <div class="map-page__popup">
        <h3>Заявки в этом месте (${group.applications.length})</h3>
        ${
          group.waterCount > 0
            ? `<p><strong>Водосеть:</strong> ${group.waterCount} заявок</p>`
            : ""
        }
        ${
          group.sewerCount > 0
            ? `<p><strong>Канализация:</strong> ${group.sewerCount} заявок</p>`
            : ""
        }
        <div style="margin-top: 12px; border-top: 1px solid #ddd; padding-top: 12px;">
          <strong>Список заявок:</strong>
          ${group.applications
            .map(
              (app) => `
            <div style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
              <p style="margin: 4px 0; font-weight: bold;">Заявка #${app.id}</p>
              <p style="margin: 2px 0; font-size: 12px;"><strong>Адрес:</strong> ${
                app.address
              }</p>
              <p style="margin: 2px 0; font-size: 12px;"><strong>Статус:</strong> ${
                app.status
              }</p>
              ${
                app.team
                  ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Бригада:</strong> ${app.team.name}</p>`
                  : ""
              }
              ${
                app.description
                  ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Описание:</strong> ${app.description}</p>`
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  };

  // Фильтруем слои в зависимости от зума (должно быть до условного рендера)
  const visibleMapFeatures = useMemo(() => {
    // Получаем текущий зум из карты, если доступен
    let currentZoom = zoom;
    try {
      if (mapRef.current && typeof mapRef.current.getZoom === "function") {
        const mapZoom = mapRef.current.getZoom();
        if (mapZoom !== undefined && mapZoom !== null) {
          currentZoom = mapZoom;
        }
      }
    } catch (e) {
      // Используем zoom из состояния
    }

    // Показываем слои только при зуме от 17 до 21 включительно
    const shouldShow = currentZoom >= 17 && currentZoom <= 21;

    if (!shouldShow) {
      return [];
    }

    return mapFeatures;
  }, [zoom, mapFeatures]);

  if (loading) {
    return <div className="map-page__loading">Загрузка карты...</div>;
  }

  const activeApps = applications.filter((app) => app.status !== "completed");
  const groupedApps = groupApplicationsByLocation(activeApps);

  return (
    <div className="map-page">
      <YMaps
        query={{
          apikey: "617fd6d2-2e4c-46ef-a3f1-afba56cfe184",
          load: "package.full", // Загружаем все модули, включая geocode
        }}
        onApiAvaliable={(ymaps) => {
          console.log("YMaps API загружен через onApiAvaliable:", ymaps);
          setYmapsInstance(ymaps);
          // Также устанавливаем в window для совместимости
          if (typeof window !== "undefined") {
            window.ymaps = ymaps;
          }
        }}
      >
        <YandexMap
          instanceRef={mapRef}
          defaultState={{
            center: center,
            zoom: zoom,
          }}
          state={{
            center: center,
            zoom: zoom,
          }}
          width="100%"
          height="100%"
          onBoundsChange={(e) => {
            try {
              if (e && e.get) {
                const newZoom = e.get("newZoom");
                if (
                  newZoom !== undefined &&
                  newZoom !== null &&
                  newZoom !== zoom
                ) {
                  console.log("Зум изменен через onBoundsChange:", newZoom);
                  setZoom(newZoom);
                }
              }
            } catch (error) {
              console.error("Ошибка при получении зума:", error);
            }
          }}
          onUpdate={(e) => {
            try {
              if (mapRef.current && mapRef.current.getZoom) {
                const currentZoom = mapRef.current.getZoom();
                if (
                  currentZoom !== undefined &&
                  currentZoom !== null &&
                  currentZoom !== zoom
                ) {
                  console.log("Зум изменен через onUpdate:", currentZoom);
                  setZoom(currentZoom);
                }
              }
            } catch (error) {
              console.error("Ошибка при обновлении зума:", error);
            }
          }}
          onActionEnd={(e) => {
            try {
              if (mapRef.current && mapRef.current.getZoom) {
                const currentZoom = mapRef.current.getZoom();
                if (
                  currentZoom !== undefined &&
                  currentZoom !== null &&
                  currentZoom !== zoom
                ) {
                  console.log("Зум изменен через onActionEnd:", currentZoom);
                  setZoom(currentZoom);
                }
              }
            } catch (error) {
              console.error(
                "Ошибка при получении зума через onActionEnd:",
                error
              );
            }
          }}
          onLoad={(ymaps) => {
            console.log("Карта загружена, ymaps:", ymaps);
            // Используем ymaps.ready() для получения правильного API объекта
            if (ymaps && typeof ymaps.ready === "function") {
              ymaps.ready().then(() => {
                // После ready() получаем правильный API объект
                const apiYmaps = window.ymaps || ymaps;
                console.log("YMaps API готов через ready():", apiYmaps);
                setYmapsInstance(apiYmaps);
                // Также устанавливаем в window для совместимости
                if (typeof window !== "undefined") {
                  window.ymaps = apiYmaps;
                  console.log("window.ymaps установлен:", window.ymaps);
                }
              });
            } else if (ymaps) {
              // Если ready() недоступен, используем ymaps напрямую
              setYmapsInstance(ymaps);
              if (typeof window !== "undefined") {
                window.ymaps = ymaps;
                console.log("window.ymaps установлен напрямую:", window.ymaps);
              }
            }
          }}
          onClick={async (e) => {
            const user = authService.getUser();
            if (
              user &&
              (user.role === "dispatcher" || user.role === "director")
            ) {
              try {
                const coords = e.get("coords");
                const position = {
                  lat: coords[0],
                  lng: coords[1],
                };

                // Получаем адрес по координатам
                const address = await getAddressFromCoordinates(
                  coords[0],
                  coords[1]
                );
                setClickedAddress(address);

                // Если активен режим добавления объектов слоев
                if (
                  addMode.isActive &&
                  addMode.layerType &&
                  addMode.objectType
                ) {
                  // Если создаем линию - нужны две точки
                  if (addMode.objectType === "line") {
                    if (!lineStartPoint) {
                      // Первая точка - сохраняем
                      setLineStartPoint(position);
                      alert(
                        `Выбрана начальная точка. Выберите конечную точку для создания линии.`
                      );
                      return;
                    } else {
                      // Вторая точка - создаем линию между двумя точками
                      setClickedPosition({
                        startPoint: lineStartPoint,
                        endPoint: position,
                      });
                      setShowLayerObjectForm(true);
                      // Запрещаем создание заявок в этом режиме
                      return;
                    }
                  } else {
                    // Для колодца и камеры - одна точка
                    setClickedPosition(position);
                    setShowLayerObjectForm(true);
                    // Запрещаем создание заявок в этом режиме
                    return;
                  }
                }

                // Обычный режим - создание заявки/гидранта
                // Проверяем, что режим создания объектов не активен
                if (!addMode.isActive) {
                  setClickedPosition(position);
                  setShowModal(true);
                }
              } catch (error) {
                console.error("Ошибка обработки клика на карте:", error);
              }
            }
          }}
        >
          {/* Отображение схем водопровода и канализации */}
          {/* Скрываем слои при зуме < 15 (масштаб > 200м) */}
          {/* Показываем слои при зуме >= 15 */}
          {visibleMapFeatures &&
            Array.isArray(visibleMapFeatures) &&
            visibleMapFeatures.length > 0 &&
            visibleMapFeatures.map((feature) => {
              const type = feature.type;
              const color = type === "water" ? "#0066cc" : "#cc6600";

              // Преобразуем GeoJSON в формат для Яндекс Карт
              let coordinates = [];
              if (feature.geojson.type === "LineString") {
                coordinates = feature.geojson.coordinates.map((coord) => [
                  coord[1],
                  coord[0],
                ]); // [lat, lng]
              } else if (feature.geojson.type === "MultiLineString") {
                coordinates = feature.geojson.coordinates.map((line) =>
                  line.map((coord) => [coord[1], coord[0]])
                );
              }

              if (coordinates.length > 0) {
                return (
                  <Polyline
                    key={`feature-${feature.id}`}
                    geometry={coordinates}
                    options={{
                      strokeColor: color,
                      strokeWidth: 3,
                      strokeOpacity: 0.8,
                    }}
                  />
                );
              }
              return null;
            })}

          {/* Отображение объектов слоев */}
          {/* Показываем колодцы, камеры и линии при зуме от 17 до 21 включительно */}
          {layerObjects
            .filter((obj) => {
              // Показываем колодцы, камеры и линии при зуме от 17 до 21 включительно
              if (zoom < 17 || zoom > 21) {
                return false;
              }
              const isVisible = layerVisibility[obj.layer_type];
              return isVisible;
            })
            .map((obj) => {
              if (obj.object_type === "line") {
                // Линия
                if (!obj.geojson || !obj.geojson.type) {
                  console.error("Ошибка: объект линии без geojson:", obj);
                  return null;
                }
                if (
                  obj.geojson.type === "LineString" &&
                  obj.geojson.coordinates &&
                  obj.geojson.coordinates.length >= 2
                ) {
                  const coordinates = obj.geojson.coordinates.map((coord) => [
                    coord[1],
                    coord[0],
                  ]);
                  const color =
                    obj.layer_type === "water" ? "#0066cc" : "#cc6600";
                  const layerName =
                    obj.layer_type === "water" ? "Водопровод" : "Канализация";

                  // Обработчик клика на трубу (открывает балун, редактирование через кнопку в балуне)
                  const handlePipeClick = (e) => {
                    e.stopPropagation();
                    // Балун откроется автоматически, редактирование доступно через кнопку в балуне
                  };

                  // Вычисляем длину трубы для отображения
                  const calculateLength = () => {
                    if (
                      obj.geojson &&
                      obj.geojson.type === "LineString" &&
                      obj.geojson.coordinates.length >= 2
                    ) {
                      let totalLength = 0;
                      for (
                        let i = 0;
                        i < obj.geojson.coordinates.length - 1;
                        i++
                      ) {
                        const [lng1, lat1] = obj.geojson.coordinates[i];
                        const [lng2, lat2] = obj.geojson.coordinates[i + 1];

                        const R = 6371000; // Радиус Земли в метрах
                        const dLat = ((lat2 - lat1) * Math.PI) / 180;
                        const dLng = ((lng2 - lng1) * Math.PI) / 180;
                        const a =
                          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                          Math.cos((lat1 * Math.PI) / 180) *
                            Math.cos((lat2 * Math.PI) / 180) *
                            Math.sin(dLng / 2) *
                            Math.sin(dLng / 2);
                        const c =
                          2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        totalLength += R * c;
                      }
                      return Math.round(totalLength * 100) / 100;
                    }
                    return null;
                  };

                  const calculatedLength = calculateLength();
                  const displayLength = obj.pipe_length || calculatedLength;
                  const user = authService.getUser();
                  const canEdit = user && user.role === "director";

                  // Вычисляем середину линии для создания заявки
                  const getLineCenter = () => {
                    if (coordinates.length > 0) {
                      const midIndex = Math.floor(coordinates.length / 2);
                      return coordinates[midIndex];
                    }
                    return coordinates[0] || [0, 0];
                  };

                  const lineCenter = getLineCenter();
                  const isHovered = hoveredLineId === obj.id;
                  const strokeColor = isHovered ? "#10b981" : color; // Зеленый при наведении

                  // Обработчик наведения на линию
                  const handleMouseEnter = () => {
                    setHoveredLineId(obj.id);
                  };

                  // Обработчик ухода курсора с линии
                  const handleMouseLeave = () => {
                    setHoveredLineId(null);
                  };

                  // Обработчик клика для создания заявки
                  const handleCreateApplication = (e) => {
                    e.stopPropagation();
                    setClickedPosition({
                      lat: lineCenter[0],
                      lng: lineCenter[1],
                    });
                    setShowModal(true);
                  };

                  // Функция для вычисления точек и углов для стрелок
                  const getArrowPoints = () => {
                    if (coordinates.length < 2) return [];

                    // Всегда используем первую и последнюю точку для определения направления
                    const [startLat, startLng] = coordinates[0];
                    const [endLat, endLng] =
                      coordinates[coordinates.length - 1];

                    // Вычисляем общее направление от первой точки к последней
                    const dLat = endLat - startLat;
                    const dLng = endLng - startLng;
                    let angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
                    // Преобразуем в угол от севера по часовой стрелке
                    angle = 90 - angle;
                    // Нормализуем угол в диапазон [0, 360)
                    if (angle < 0) angle += 360;

                    const arrowPoints = [];
                    const numArrows = Math.max(
                      2,
                      Math.min(5, Math.floor(coordinates.length / 2))
                    ); // 2-5 стрелок

                    // Вычисляем общую длину линии для равномерного размещения
                    const segmentLengths = [];
                    let totalLength = 0;

                    for (let i = 1; i < coordinates.length; i++) {
                      const [lat1, lng1] = coordinates[i - 1];
                      const [lat2, lng2] = coordinates[i];

                      // Вычисляем расстояние между точками (приблизительно)
                      const dLat = lat2 - lat1;
                      const dLng = lng2 - lng1;
                      const segmentLength = Math.sqrt(
                        dLat * dLat + dLng * dLng
                      );

                      segmentLengths.push({
                        start: coordinates[i - 1],
                        end: coordinates[i],
                        length: segmentLength,
                        cumulativeLength: totalLength,
                      });

                      totalLength += segmentLength;
                    }

                    // Размещаем стрелки равномерно вдоль линии
                    for (let i = 1; i <= numArrows; i++) {
                      const targetDistance =
                        (totalLength * i) / (numArrows + 1);

                      // Находим сегмент, в котором находится целевая точка
                      let currentDistance = 0;
                      for (let j = 0; j < segmentLengths.length; j++) {
                        const segment = segmentLengths[j];
                        const nextDistance = currentDistance + segment.length;

                        if (
                          targetDistance <= nextDistance ||
                          j === segmentLengths.length - 1
                        ) {
                          // Вычисляем позицию на сегменте
                          const segmentProgress =
                            (targetDistance - currentDistance) / segment.length;
                          const [lat1, lng1] = segment.start;
                          const [lat2, lng2] = segment.end;

                          const arrowLat =
                            lat1 + (lat2 - lat1) * segmentProgress;
                          const arrowLng =
                            lng1 + (lng2 - lng1) * segmentProgress;

                          // Все стрелки указывают в одном направлении - от первой точки к последней
                          arrowPoints.push({
                            lat: arrowLat,
                            lng: arrowLng,
                            angle: angle,
                          });

                          break;
                        }

                        currentDistance = nextDistance;
                      }
                    }

                    return arrowPoints;
                  };

                  const arrowPoints = getArrowPoints();
                  const arrowIcon =
                    obj.layer_type === "water"
                      ? "/images/icons/arrow-water.svg"
                      : "/images/icons/arrow-sewer.svg";

                  return (
                    <React.Fragment key={`line-fragment-${obj.id}`}>
                      <Polyline
                        key={`layer-line-${obj.id}`}
                        geometry={coordinates}
                        properties={{
                          balloonContent: `
                                  <div class="map-page__popup">
                                    <h3>Линия #${obj.id}</h3>
                                    <p><strong>Слой:</strong> ${layerName}</p>
                                    ${
                                      obj.pipe_size
                                        ? `<p><strong>Диаметр трубы:</strong> ${obj.pipe_size}</p>`
                                        : ""
                                    }
                                    ${
                                      obj.pipe_material
                                        ? `<p><strong>Материал трубы:</strong> ${
                                            obj.pipe_material === "plastic"
                                              ? "Пластик"
                                              : obj.pipe_material ===
                                                "cast_iron"
                                              ? "Чугун"
                                              : obj.pipe_material === "steel"
                                              ? "Сталь"
                                              : obj.pipe_material ===
                                                "asbestos_cement"
                                              ? "Асбестоцемент"
                                              : obj.pipe_material === "concrete"
                                              ? "Бетон"
                                              : obj.pipe_material === "other"
                                              ? "Другое"
                                              : obj.pipe_material
                                          }</p>`
                                        : ""
                                    }
                                    ${
                                      displayLength
                                        ? `<p><strong>Длина трубы:</strong> ${displayLength} м</p>`
                                        : ""
                                    }
                                    ${
                                      obj.balance_delimitation
                                        ? `<p><strong>Балансовое разграничение:</strong> ${obj.balance_delimitation}</p>`
                                        : ""
                                    }
                                    ${
                                      obj.address
                                        ? `<p><strong>Адрес:</strong> ${obj.address}</p>`
                                        : ""
                                    }
                                    ${
                                      obj.description
                                        ? `<p><strong>Описание:</strong> ${obj.description}</p>`
                                        : ""
                                    }
                                    <p>
                                      ${
                                        !addMode.isActive
                                          ? `<button onclick="window.dispatchEvent(new CustomEvent('createApplicationAtLine', {detail: {lineId: ${obj.id}, lat: ${lineCenter[0]}, lng: ${lineCenter[1]}}}))" style="margin-top: 8px; padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 8px;">Создать заявку</button>`
                                          : ""
                                      }
                                      ${
                                        canEdit
                                          ? `<button onclick="window.dispatchEvent(new CustomEvent('editPipe', {detail: {pipeId: ${obj.id}}}))" style="margin-top: 8px; padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 8px;">Редактировать</button>`
                                          : ""
                                      }
                                      ${
                                        canEdit
                                          ? `<button onclick="window.dispatchEvent(new CustomEvent('deleteLayerObject', {detail: {objectId: ${obj.id}}}))" style="margin-top: 8px; padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️ Удалить</button>`
                                          : ""
                                      }
                                    </p>
                                  </div>
                                `,
                        }}
                        options={{
                          strokeColor: strokeColor,
                          strokeWidth: isHovered ? 5 : 3,
                          strokeOpacity: 0.8,
                          cursor: "pointer",
                        }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClick={handlePipeClick}
                      />
                      {/* Стрелки направления движения воды */}
                      {arrowPoints.map((arrowPoint, arrowIndex) => (
                        <Placemark
                          key={`arrow-${obj.id}-${arrowIndex}`}
                          geometry={[arrowPoint.lat, arrowPoint.lng]}
                          options={{
                            iconLayout: "default#image",
                            iconImageHref: arrowIcon,
                            iconImageSize: [24, 24],
                            iconImageOffset: [-12, -12],
                            iconImageRotation: arrowPoint.angle,
                            zIndex: 1000,
                            cursor: "default",
                          }}
                        />
                      ))}
                    </React.Fragment>
                  );
                }
              } else if (
                obj.object_type === "well" ||
                obj.object_type === "chamber"
              ) {
                // Колодец или камера
                if (!obj.geojson || !obj.geojson.type) {
                  console.error(
                    "Ошибка: объект колодца/камеры без geojson:",
                    obj
                  );
                  return null;
                }
                if (
                  obj.geojson.type === "Point" &&
                  obj.geojson.coordinates &&
                  obj.geojson.coordinates.length === 2
                ) {
                  const [lng, lat] = obj.geojson.coordinates;

                  // Проверяем валидность координат
                  if (
                    isNaN(lat) ||
                    isNaN(lng) ||
                    lat === null ||
                    lng === null
                  ) {
                    console.error(
                      "Ошибка: невалидные координаты для объекта:",
                      obj.id,
                      "lat:",
                      lat,
                      "lng:",
                      lng
                    );
                    return null;
                  }
                  const iconImage =
                    obj.object_type === "well"
                      ? obj.layer_type === "sewer"
                        ? "/images/icons/well-sewer.svg"
                        : "/images/icons/well.svg"
                      : "/images/icons/chamber.svg";

                  const objectName =
                    obj.object_type === "well" ? "Колодец" : "Камера";
                  const layerName =
                    obj.layer_type === "water" ? "Водопровод" : "Канализация";

                  // Получаем угол поворота из geojson (если есть)
                  const rotation = obj.geojson.rotation || 0;

                  // Проверяем права доступа для удаления (только директор)
                  const user = authService.getUser();
                  const canDelete = user && user.role === "director";

                  // Формируем HTML для задвижек (только для колодцев)
                  let valvesHtml = "";
                  if (
                    obj.object_type === "well" &&
                    obj.valves &&
                    obj.valves.length > 0
                  ) {
                    valvesHtml = `
                            <div style="margin-top: 12px;">
                              <strong>Задвижки:</strong>
                              <ul style="margin: 8px 0; padding-left: 20px;">
                                ${obj.valves
                                  .map(
                                    (valve) => `
                                  <li style="margin: 4px 0;">
                                    ${
                                      valve.valve_number
                                        ? `<strong>№${valve.valve_number}</strong> `
                                        : ""
                                    }
                                    ${
                                      valve.valve_type
                                        ? `(${valve.valve_type}) `
                                        : ""
                                    }
                                    <span style="color: ${
                                      valve.status === "working"
                                        ? "#10b981"
                                        : valve.status === "not_working"
                                        ? "#dc2626"
                                        : "#f59e0b"
                                    };">
                                      ${
                                        valve.status === "working"
                                          ? "Рабочая"
                                          : valve.status === "not_working"
                                          ? "Не рабочая"
                                          : "Требует ремонт"
                                      }
                                    </span>
                                    ${
                                      valve.description
                                        ? `<br><small>${valve.description}</small>`
                                        : ""
                                    }
                                  </li>
                                `
                                  )
                                  .join("")}
                              </ul>
                            </div>
                          `;
                  }

                  // Обработчик окончания перетаскивания
                  const handleDragEnd = async (e) => {
                    const newCoords = e.get("target").geometry.getCoordinates();
                    const newLat = newCoords[0];
                    const newLng = newCoords[1];

                    try {
                      const updatedGeojson = {
                        ...obj.geojson,
                        coordinates: [newLng, newLat],
                      };

                      await api.put(`/map/layers/objects/${obj.id}`, {
                        geojson: updatedGeojson,
                      });

                      // Обновляем данные на карте
                      await loadMapData();
                    } catch (error) {
                      console.error("Ошибка при обновлении координат:", error);
                      alert("Ошибка при сохранении координат");
                    }
                  };

                  // Обработчик вращения
                  const handleRotate = async (angle) => {
                    try {
                      const updatedGeojson = {
                        ...obj.geojson,
                        rotation: angle,
                      };

                      await api.put(`/map/layers/objects/${obj.id}`, {
                        geojson: updatedGeojson,
                      });

                      // Обновляем данные на карте
                      await loadMapData();
                    } catch (error) {
                      console.error(
                        "Ошибка при обновлении угла поворота:",
                        error
                      );
                      alert("Ошибка при сохранении угла поворота");
                    }
                  };

                  // Обработчик клика на колодец для построения линии
                  const handleWellClick = async (e) => {
                    e.stopPropagation();

                    // Если активен режим построения линии между колодцами
                    if (
                      lineBuildingMode.isActive &&
                      obj.object_type === "well"
                    ) {
                      if (!lineBuildingMode.startWell) {
                        // Выбираем первый колодец
                        setLineBuildingMode({
                          ...lineBuildingMode,
                          startWell: obj,
                        });
                        alert(
                          `Выбран колодец #${obj.id}. Теперь выберите второй колодец для создания трубы.`
                        );
                      } else if (lineBuildingMode.startWell.id !== obj.id) {
                        // Выбираем второй колодец и создаем линию
                        const startWell = lineBuildingMode.startWell;
                        const endWell = obj;

                        try {
                          const startCoords = startWell.geojson.coordinates;
                          const endCoords = endWell.geojson.coordinates;

                          const geojson = {
                            type: "LineString",
                            coordinates: [startCoords, endCoords],
                          };

                          await api.post("/map/layers/objects", {
                            layer_type: lineBuildingMode.layerType,
                            object_type: "line",
                            geojson: geojson,
                            address: null,
                            description: `Труба между колодцами #${startWell.id} и #${endWell.id}`,
                            pipe_size: null,
                          });

                          // Обновляем данные на карте
                          await loadMapData();

                          // Сбрасываем режим построения
                          setLineBuildingMode({
                            isActive: false,
                            layerType: null,
                            startWell: null,
                          });
                          alert("Труба успешно создана между колодцами!");
                        } catch (error) {
                          console.error("Ошибка при создании трубы:", error);
                          alert("Ошибка при создании трубы");
                        }
                      } else {
                        alert("Выберите другой колодец для создания трубы.");
                      }
                    }
                  };

                  return (
                    <Placemark
                      key={`layer-${obj.object_type}-${obj.id}`}
                      geometry={[lat, lng]}
                      properties={{
                        balloonContent: `
                                <div class="map-page__popup">
                                  <h3>${objectName} #${obj.id}</h3>
                                  <p><strong>Слой:</strong> ${layerName}</p>
                                  ${
                                    obj.address
                                      ? `<p><strong>Адрес:</strong> ${obj.address}</p>`
                                      : ""
                                  }
                                  ${
                                    obj.description
                                      ? `<p><strong>Описание:</strong> ${obj.description}</p>`
                                      : ""
                                  }
                                  ${valvesHtml}
                                  <p><strong>Координаты:</strong> ${lat.toFixed(
                                    6
                                  )}, ${lng.toFixed(6)}</p>
                                  <p><strong>Угол поворота:</strong> ${rotation}°</p>
                                  <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                                    <button onclick="window.dispatchEvent(new CustomEvent('rotateObject', {detail: {objectId: ${
                                      obj.id
                                    }, currentAngle: ${rotation}, direction: 'left'}}))" style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">↺ Влево</button>
                                    <button onclick="window.dispatchEvent(new CustomEvent('rotateObject', {detail: {objectId: ${
                                      obj.id
                                    }, currentAngle: ${rotation}, direction: 'right'}}))" style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">↻ Вправо</button>
                                    ${
                                      obj.object_type === "well"
                                        ? `<button onclick="window.dispatchEvent(new CustomEvent('openWellValves', {detail: {wellId: ${obj.id}}}))" style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Управление задвижками</button>`
                                        : ""
                                    }
                                    ${
                                      lineBuildingMode.isActive &&
                                      obj.object_type === "well"
                                        ? `<button onclick="window.dispatchEvent(new CustomEvent('selectWellForLine', {detail: {wellId: ${
                                            obj.id
                                          }}}))" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">${
                                            lineBuildingMode.startWell
                                              ? "Выбрать как конечную точку"
                                              : "Выбрать как начальную точку"
                                          }</button>`
                                        : ""
                                    }
                                    ${
                                      canDelete
                                        ? `<button onclick="window.dispatchEvent(new CustomEvent('deleteLayerObject', {detail: {objectId: ${obj.id}}}))" style="padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️ Удалить</button>`
                                        : ""
                                    }
                                  </div>
                                </div>
                              `,
                      }}
                      options={{
                        iconLayout: "default#image",
                        iconImageHref: iconImage,
                        iconImageSize: [16, 16],
                        iconImageOffset: [-8, -8],
                        iconImageScale: 1,
                        draggable: true,
                        iconImageRotation: rotation,
                        cursor:
                          lineBuildingMode.isActive &&
                          obj.object_type === "well"
                            ? "pointer"
                            : "default",
                      }}
                      onDragEnd={handleDragEnd}
                      onClick={handleWellClick}
                    />
                  );
                }
              }
              return null;
            })}

          {/* Отображение заявок */}
          {groupedApps.map((group, index) => {
            if (group.applications.length === 1) {
              const app = group.applications[0];
              return (
                <Placemark
                  key={`app-${app.id}`}
                  geometry={[group.lat, group.lng]}
                  properties={{
                    balloonContent: createApplicationBalloon(app),
                  }}
                  options={{
                    iconLayout: "default#image",
                    iconImageHref: "/images/icons/drop-red.svg",
                    iconImageSize: [24, 32],
                    iconImageOffset: [-12, -32],
                    iconImageScale: 1,
                  }}
                />
              );
            } else {
              // Группа заявок с счетчиком
              const badgeText =
                group.waterCount > 0 && group.sewerCount > 0
                  ? `${group.waterCount}/${group.sewerCount}`
                  : group.waterCount > 0
                  ? group.waterCount.toString()
                  : group.sewerCount > 0
                  ? group.sewerCount.toString()
                  : group.applications.length.toString();

              return (
                <Placemark
                  key={`group-${index}-${group.lat}-${group.lng}`}
                  geometry={[group.lat, group.lng]}
                  properties={{
                    balloonContent: createGroupBalloon(group),
                    iconContent: badgeText,
                  }}
                  options={{
                    iconLayout: "default#image",
                    iconImageHref: "/images/icons/drop-red.svg",
                    iconImageSize: [24, 32],
                    iconImageOffset: [-12, -32],
                    iconImageScale: 1,
                  }}
                />
              );
            }
          })}

          {/* Отображение гидрантов */}
          {layerVisibility.hydrants &&
            hydrants.map((hydrant) => {
              if (
                hydrant.coordinates &&
                hydrant.coordinates.lat != null &&
                hydrant.coordinates.lng != null &&
                !isNaN(hydrant.coordinates.lat) &&
                !isNaN(hydrant.coordinates.lng)
              ) {
                // Определяем иконку и текст статуса в зависимости от статуса
                let iconImage = "/images/icons/hydrant-pg.svg"; // Красная по умолчанию
                let statusText = "Не указан";

                if (hydrant.status === "working") {
                  iconImage = "/images/icons/hydrant-pg.svg"; // Красная для рабочего
                  statusText = "Рабочий";
                } else if (hydrant.status === "not_working") {
                  iconImage = "/images/icons/hydrant-pg-yellow.svg"; // Желтая для не рабочего
                  statusText = "Не рабочий";
                } else if (hydrant.status === "needs_repair") {
                  iconImage = "/images/icons/hydrant-pg-green.svg"; // Зеленая для требует ремонт
                  statusText = "Требует ремонт";
                }

                const photosHtml =
                  hydrant.photos && hydrant.photos.length > 0
                    ? `<div style="margin-top: 12px;">
                          <strong>Фото:</strong>
                          <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                            ${hydrant.photos
                              .map(
                                (photo) => `
                              <img 
                                src="http://localhost:5000${photo.path}" 
                                alt="Фото гидранта" 
                                style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; cursor: pointer;"
                                onclick="window.open('http://localhost:5000${photo.path}', '_blank')"
                              />
                            `
                              )
                              .join("")}
                          </div>
                        </div>`
                    : "";

                return (
                  <Placemark
                    key={`hydrant-${hydrant.id}`}
                    geometry={[
                      hydrant.coordinates.lat,
                      hydrant.coordinates.lng,
                    ]}
                    properties={{
                      balloonContent: `
                      <div class="map-page__popup">
                        <h3>Гидрант #${hydrant.id}</h3>
                        ${
                          hydrant.address
                            ? `<p><strong>Адрес:</strong> ${hydrant.address}</p>`
                            : ""
                        }
                        <p><strong>Статус:</strong> <span style="color: ${
                          hydrant.status === "working"
                            ? "#10b981"
                            : hydrant.status === "not_working"
                            ? "#dc2626"
                            : "#f59e0b"
                        }; font-weight: bold;">${statusText}</span></p>
                        ${
                          hydrant.description
                            ? `<p><strong>Описание:</strong> ${hydrant.description}</p>`
                            : ""
                        }
                        <p><strong>Координаты:</strong> ${hydrant.coordinates.lat.toFixed(
                          6
                        )}, ${hydrant.coordinates.lng.toFixed(6)}</p>
                        ${photosHtml}
                      </div>
                    `,
                    }}
                    options={{
                      iconLayout: "default#image",
                      iconImageHref: iconImage,
                      iconImageSize: [32, 32],
                      iconImageOffset: [-16, -16],
                    }}
                  />
                );
              }
              return null;
            })}
        </YandexMap>
      </YMaps>

      {/* Выдвижная панель справа с вкладками */}
      <SidePanel
        onAddModeChange={(newAddMode) => {
          setAddMode(newAddMode);
          // Сбрасываем начальную точку линии при изменении режима
          if (!newAddMode.isActive || newAddMode.objectType !== "line") {
            setLineStartPoint(null);
          }
        }}
        addMode={addMode}
        onLayerVisibilityChange={setLayerVisibility}
        layerVisibility={layerVisibility}
        onLineBuildingModeChange={setLineBuildingMode}
        lineBuildingMode={lineBuildingMode}
      />

      {/* Модальное окно для заявок/гидрантов */}
      {showModal && clickedPosition && (
        <MapClickModal
          position={clickedPosition}
          address={clickedAddress}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
        />
      )}

      {/* Форма для объектов слоев */}
      {showLayerObjectForm && clickedPosition && addMode.isActive && (
        <LayerObjectForm
          position={clickedPosition}
          address={clickedAddress}
          layerType={addMode.layerType}
          objectType={addMode.objectType}
          onClose={() => {
            setShowLayerObjectForm(false);
            setClickedPosition(null);
            setClickedAddress(null);
            setLineStartPoint(null); // Сбрасываем начальную точку линии
          }}
          onSubmit={async () => {
            await loadMapData();
            setShowLayerObjectForm(false);
            setClickedPosition(null);
            setClickedAddress(null);
            setLineStartPoint(null); // Сбрасываем начальную точку линии
            setAddMode({ layerType: null, objectType: null, isActive: false });
          }}
        />
      )}

      {/* Модальное окно управления задвижками колодца */}
      {showWellValvesModal && selectedWell && (
        <WellValvesModal
          wellId={selectedWell.id}
          wellInfo={{
            address: selectedWell.address,
            description: selectedWell.description,
          }}
          onClose={() => {
            setShowWellValvesModal(false);
            setSelectedWell(null);
          }}
          onUpdate={async () => {
            await loadMapData();
          }}
        />
      )}

      {/* Модальное окно редактирования трубы */}
      {showPipeEditModal && selectedPipe && (
        <PipeEditModal
          pipe={selectedPipe}
          onClose={() => {
            setShowPipeEditModal(false);
            setSelectedPipe(null);
          }}
          onUpdate={async () => {
            await loadMapData();
          }}
        />
      )}

      {/* Модальное окно подтверждения удаления */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (deleteConfirmResolveRef.current) {
                deleteConfirmResolveRef.current(false);
                deleteConfirmResolveRef.current = null;
              }
              setDeleteConfirm(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
              Подтверждение удаления
            </h3>
            <p style={{ margin: "0 0 24px 0", fontSize: "14px" }}>
              Вы уверены, что хотите удалить {deleteConfirm.objectName} #
              {deleteConfirm.objectId}?
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  if (deleteConfirmResolveRef.current) {
                    deleteConfirmResolveRef.current(false);
                    deleteConfirmResolveRef.current = null;
                  }
                  setDeleteConfirm(null);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmResolveRef.current) {
                    deleteConfirmResolveRef.current(true);
                    deleteConfirmResolveRef.current = null;
                  }
                  setDeleteConfirm(null);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
