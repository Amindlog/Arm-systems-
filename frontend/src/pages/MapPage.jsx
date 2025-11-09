import { useState, useEffect, useRef } from "react";
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
import AddressSearch from "../components/AddressSearch/AddressSearch";
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
  const [clickedPosition, setClickedPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState({ layerType: null, objectType: null, isActive: false });
  const [layerVisibility, setLayerVisibility] = useState({ water: true, sewer: true });
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
        console.log('window.ymaps найден через useEffect:', window.ymaps);
        // Используем ready() для получения правильного API объекта
        if (typeof window.ymaps.ready === 'function') {
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

  // Обработчик открытия модального окна задвижек
  useEffect(() => {
    const handleOpenWellValves = (event) => {
      if (event.detail && event.detail.wellId) {
        const well = layerObjects.find(obj => obj.id === event.detail.wellId && obj.object_type === 'well');
        if (well) {
          setSelectedWell(well);
          setShowWellValvesModal(true);
        }
      }
    };

    window.addEventListener("openWellValves", handleOpenWellValves);
    return () => window.removeEventListener("openWellValves", handleOpenWellValves);
  }, [layerObjects]);

  const loadMapData = async () => {
    try {
      const [featuresResponse, applicationsResponse, hydrantsResponse, layerObjectsResponse] =
        await Promise.all([
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

      setMapFeatures(featuresResponse.data.features || []);
      setApplications(loadedApplications);
      setHydrants(hydrantsResponse.data.hydrants || []);
      setLayerObjects(layerObjectsResponse.data.objects || []);
    } catch (error) {
      console.error("Error loading map data:", error);
      console.error("Error details:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (e) => {
    const user = authService.getUser();
    if (user && (user.role === "dispatcher" || user.role === "director")) {
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

  const handleModalClose = () => {
    setShowModal(false);
    setClickedPosition(null);
  };

  const handleAddressFound = ({ center: newCenter, zoom: newZoom }) => {
    console.log('Перемещение карты к адресу:', newCenter, newZoom);
    
    // Обновляем состояние для синхронизации
    setCenter(newCenter);
    setZoom(newZoom);
    
    // Перемещаем карту программно
    if (mapRef.current) {
      try {
        // Используем setTimeout для гарантии, что карта готова
        setTimeout(() => {
          if (mapRef.current) {
            try {
              // Пробуем использовать setCenter и setZoom напрямую
              if (typeof mapRef.current.setCenter === 'function') {
                mapRef.current.setCenter(newCenter);
              }
              if (typeof mapRef.current.setZoom === 'function') {
                mapRef.current.setZoom(newZoom);
              }
              
              // Пробуем использовать panTo для плавного перемещения (если доступно)
              if (typeof mapRef.current.panTo === 'function') {
                try {
                  mapRef.current.panTo(newCenter, {
                    duration: 500,
                  });
                } catch (e) {
                  console.log('panTo не доступен, используем setCenter');
                }
              }
            } catch (error) {
              console.error("Ошибка при перемещении карты:", error);
              // Fallback: обновляем через state
              setCenter(newCenter);
              setZoom(newZoom);
            }
          } else {
            console.error("mapRef.current не доступен");
            // Fallback: обновляем через state
            setCenter(newCenter);
            setZoom(newZoom);
          }
        }, 200);
      } catch (error) {
        console.error("Ошибка при перемещении карты:", error);
        // Fallback: обновляем через state
        setCenter(newCenter);
        setZoom(newZoom);
      }
    } else {
      console.error("mapRef не доступен");
      // Fallback: обновляем через state
      setCenter(newCenter);
      setZoom(newZoom);
    }
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
          load: "package.full" // Загружаем все модули, включая geocode
        }}
        onApiAvaliable={(ymaps) => {
          console.log('YMaps API загружен через onApiAvaliable:', ymaps);
          setYmapsInstance(ymaps);
          // Также устанавливаем в window для совместимости
          if (typeof window !== 'undefined') {
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
          onLoad={(ymaps) => {
            console.log('Карта загружена, ymaps:', ymaps);
            // Используем ymaps.ready() для получения правильного API объекта
            if (ymaps && typeof ymaps.ready === 'function') {
              ymaps.ready().then(() => {
                // После ready() получаем правильный API объект
                const apiYmaps = window.ymaps || ymaps;
                console.log('YMaps API готов через ready():', apiYmaps);
                setYmapsInstance(apiYmaps);
                // Также устанавливаем в window для совместимости
                if (typeof window !== 'undefined') {
                  window.ymaps = apiYmaps;
                  console.log('window.ymaps установлен:', window.ymaps);
                }
              });
            } else if (ymaps) {
              // Если ready() недоступен, используем ymaps напрямую
              setYmapsInstance(ymaps);
              if (typeof window !== 'undefined') {
                window.ymaps = ymaps;
                console.log('window.ymaps установлен напрямую:', window.ymaps);
              }
            }
          }}
          onClick={(e) => {
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

                // Если активен режим добавления объектов слоев
                if (addMode.isActive && addMode.layerType && addMode.objectType) {
                  setClickedPosition(position);
                  setShowLayerObjectForm(true);
                } else {
                  // Обычный режим - создание заявки/гидранта
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
                {mapFeatures.map((feature) => {
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
                {layerObjects
                  .filter((obj) => layerVisibility[obj.layer_type])
                  .map((obj) => {
                    if (obj.object_type === "line") {
                      // Линия
                      if (obj.geojson.type === "LineString" && obj.geojson.coordinates.length >= 2) {
                        const coordinates = obj.geojson.coordinates.map((coord) => [
                          coord[1],
                          coord[0],
                        ]);
                        const color = obj.layer_type === "water" ? "#0066cc" : "#cc6600";
                        const layerName = obj.layer_type === "water" ? "Водопровод" : "Канализация";

                        return (
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
                                      ? `<p><strong>Размер трубы:</strong> ${obj.pipe_size}</p>`
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
                                </div>
                              `,
                            }}
                            options={{
                              strokeColor: color,
                              strokeWidth: 3,
                              strokeOpacity: 0.8,
                            }}
                          />
                        );
                      }
                    } else if (obj.object_type === "well" || obj.object_type === "chamber") {
                      // Колодец или камера
                      if (obj.geojson.type === "Point") {
                        const [lng, lat] = obj.geojson.coordinates;
                        const iconImage =
                          obj.object_type === "well"
                            ? "/images/icons/well.svg"
                            : "/images/icons/chamber.svg";

                        const objectName = obj.object_type === "well" ? "Колодец" : "Камера";
                        const layerName = obj.layer_type === "water" ? "Водопровод" : "Канализация";

                        // Формируем HTML для задвижек (только для колодцев)
                        let valvesHtml = "";
                        if (obj.object_type === "well" && obj.valves && obj.valves.length > 0) {
                          valvesHtml = `
                            <div style="margin-top: 12px;">
                              <strong>Задвижки:</strong>
                              <ul style="margin: 8px 0; padding-left: 20px;">
                                ${obj.valves
                                  .map(
                                    (valve) => `
                                  <li style="margin: 4px 0;">
                                    ${valve.valve_number ? `<strong>№${valve.valve_number}</strong> ` : ""}
                                    ${valve.valve_type ? `(${valve.valve_type}) ` : ""}
                                    <span style="color: ${
                                      valve.status === "working"
                                        ? "#10b981"
                                        : valve.status === "not_working"
                                        ? "#dc2626"
                                        : "#f59e0b"
                                    };">
                                      ${valve.status === "working"
                                        ? "Рабочая"
                                        : valve.status === "not_working"
                                        ? "Не рабочая"
                                        : "Требует ремонт"}
                                    </span>
                                    ${valve.description ? `<br><small>${valve.description}</small>` : ""}
                                  </li>
                                `
                                  )
                                  .join("")}
                              </ul>
                            </div>
                          `;
                        }

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
                                  <p><strong>Координаты:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                                  ${obj.object_type === "well" ? `<p><button onclick="window.dispatchEvent(new CustomEvent('openWellValves', {detail: {wellId: ${obj.id}}}))" style="margin-top: 8px; padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Управление задвижками</button></p>` : ""}
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
                    preset: "islands#circleIcon",
                    iconColor: getApplicationColor(app),
                  }}
                />
              );
            } else {
              // Группа заявок с счетчиком
              const color = getGroupColor(group);
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
                    preset: "islands#circleIcon",
                    iconColor: color,
                  }}
                />
              );
            }
          })}

          {/* Отображение гидрантов */}
          {hydrants.map((hydrant) => {
            if (
              hydrant.coordinates &&
              hydrant.coordinates.lat &&
              hydrant.coordinates.lng
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
                  geometry={[hydrant.coordinates.lat, hydrant.coordinates.lng]}
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

      {/* Поиск адреса */}
      <AddressSearch 
        onAddressFound={handleAddressFound}
        ymaps={ymapsInstance}
      />

      {/* Выдвижная панель справа с вкладками */}
      <SidePanel
        onAddModeChange={setAddMode}
        addMode={addMode}
        onLayerVisibilityChange={setLayerVisibility}
        layerVisibility={layerVisibility}
      />

      {/* Модальное окно для заявок/гидрантов */}
      {showModal && clickedPosition && (
        <MapClickModal
          position={clickedPosition}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
        />
      )}

      {/* Форма для объектов слоев */}
      {showLayerObjectForm && clickedPosition && addMode.isActive && (
        <LayerObjectForm
          position={clickedPosition}
          layerType={addMode.layerType}
          objectType={addMode.objectType}
          onClose={() => {
            setShowLayerObjectForm(false);
            setClickedPosition(null);
          }}
          onSubmit={async () => {
            await loadMapData();
            setShowLayerObjectForm(false);
            setClickedPosition(null);
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
            description: selectedWell.description
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
    </div>
  );
};

export default MapPage;
